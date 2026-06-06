<?php
header('Content-Type: application/json');
error_reporting(0);
ini_set('display_errors', 0);

function sendResponse($data) {
    echo json_encode($data);
    exit;
}

try {
    require_once 'db_connect.php';
    
    if (!isset($_SESSION['user_id'])) {
        sendResponse(['error' => 'Не авторизован']);
    }
    
    $user_id = $_SESSION['user_id'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    $name = $input['name'] ?? 'Автомат';
    $price = (float)($input['price'] ?? 0);
    $rent = (float)($input['rent'] ?? 0);
    $useCredit = $input['use_credit'] ?? false;
    $months = (int)($input['months'] ?? 12);
    
    if ($price <= 0 || $rent < 0) {
        sendResponse(['error' => 'Неверные данные']);
    }
    
    $stmt = $pdo->prepare("SELECT id, game_state FROM game_saves WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $save = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($save) {
        $state = json_decode($save['game_state'], true);
        if (!$state) $state = [];
    } else {
        require_once 'default_state.php';
        $state = getDefaultState();
    }
    
    $canPay = $state['balance'] >= $price;
    
    if ($canPay) {
        $state['balance'] -= $price;
        $transactionDesc = "🛒 Покупка автомата «{$name}» (аренда " . number_format($rent, 2, '.', ' ') . " ₽/мес)";
        $category = 'expense';
        $amount = $price;
    } elseif ($useCredit) {
        // Запрещаем второй кредит
        if (!empty($state['loans'])) {
            sendResponse(['error' => 'У вас уже есть активный кредит. Погасите текущий перед оформлением нового.']);
        }
        
        // Ставки в зависимости от срока кредита
        if ($months == 6) {
            $annualRate = 0.25; // 25% для 6 месяцев
        } elseif ($months == 12) {
            $annualRate = 0.22; // 22% для 12 месяцев
        } elseif ($months == 24) {
            $annualRate = 0.18; // 18% для 24 месяцев
        } else {
            $annualRate = 0.25; // по умолчанию 25%
        }
        
        $monthlyRate = $annualRate / 12;
        $monthlyPayment = $price * ($monthlyRate * pow(1 + $monthlyRate, $months)) / (pow(1 + $monthlyRate, $months) - 1);
        
        $state['loans'][] = [
            'machineId' => $state['machineCounter'],
            'totalOwed' => $price,
            'monthlyPayment' => $monthlyPayment,
            'remainingMonths' => $months,
            'startDate' => date('Y-m-d H:i:s'),
            'lastPaymentDate' => date('Y-m-d H:i:s'),
            'interestRate' => $annualRate
        ];
        
        $transactionDesc = "💰 Кредит на автомат «{$name}»: " . number_format($price, 2, '.', ' ') . " ₽, {$months} мес., ставка " . ($annualRate * 100) . "% годовых, ежемес. платёж " . number_format($monthlyPayment, 2, '.', ' ');
        $category = 'info';
        $amount = 0;
    } else {
        sendResponse(['error' => 'Недостаточно средств. Оформите кредит!']);
    }
    
    $state['machines'][] = [
        'id' => $state['machineCounter'],
        'name' => $name,
        'buyPrice' => $price,
        'rent' => $rent,
        'maintenance' => 1000,
        'amortization' => 2,
        'totalSales' => 0,
        'totalIncome' => 0,
        'totalExpense' => 0
    ];
    $state['machineCounter']++;
    
    $transaction = [
        'timestamp' => date('Y-m-d H:i:s'),
        'amount' => $amount,
        'description' => $transactionDesc,
        'category' => $category,
        'cups' => 0
    ];
    array_unshift($state['transactions'], $transaction);
    array_unshift($state['transactionHistory'], $transaction);
    
    if ($category === 'expense') {
        $state['totalExpenseEver'] += $amount;
    }
    
    $state['transactions'] = array_slice($state['transactions'], 0, 500);
    $state['transactionHistory'] = array_slice($state['transactionHistory'], 0, 5000);
    
    $json = json_encode($state);
    
    if ($save) {
        $updateStmt = $pdo->prepare("UPDATE game_saves SET game_state = ?, last_sync_time = NOW() WHERE id = ?");
        $updateStmt->execute([$json, $save['id']]);
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO game_saves (user_id, game_state, last_sync_time) VALUES (?, ?, NOW())");
        $insertStmt->execute([$user_id, $json]);
    }
    
    echo $json;
    
} catch (Exception $e) {
    sendResponse(['error' => $e->getMessage()]);
}
?>