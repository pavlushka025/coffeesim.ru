<?php
function getDefaultState() {
    // Реальные автоматы с параметрами
    $realMachines = [
        [
            'name' => 'Jetinno JL 300',
            'price' => 399000,
            'rent' => 15000,
            'acquirerPercent' => 1.8,
            'maintenanceCost' => 3000,
            'serviceCost' => 800,
            'powerKwh' => 2.5,
            'description' => 'Профессиональный автомат, 300 чашек в день'
        ],
        [
            'name' => 'Saeco Royal Professional',
            'price' => 520000,
            'rent' => 20000,
            'acquirerPercent' => 1.5,
            'maintenanceCost' => 3500,
            'serviceCost' => 900,
            'powerKwh' => 3.0,
            'description' => 'Итальянский автомат, 350 чашек в день'
        ],
        [
            'name' => 'Necta Krea',
            'price' => 480000,
            'rent' => 18000,
            'acquirerPercent' => 2.0,
            'maintenanceCost' => 2800,
            'serviceCost' => 750,
            'powerKwh' => 2.2,
            'description' => 'Надёжный автомат, 280 чашек в день'
        ],
        [
            'name' => 'Unicum Milano',
            'price' => 650000,
            'rent' => 25000,
            'acquirerPercent' => 1.4,
            'maintenanceCost' => 4000,
            'serviceCost' => 1000,
            'powerKwh' => 3.5,
            'description' => 'Премиум класс, 400 чашек в день'
        ],
        [
            'name' => 'Rheavendors E-Bar',
            'price' => 590000,
            'rent' => 22000,
            'acquirerPercent' => 1.6,
            'maintenanceCost' => 3200,
            'serviceCost' => 850,
            'powerKwh' => 2.8,
            'description' => 'Энергоэффективный, 320 чашек в день'
        ],
        [
            'name' => 'Azkoyen Vitro X2',
            'price' => 720000,
            'rent' => 28000,
            'acquirerPercent' => 1.3,
            'maintenanceCost' => 4500,
            'serviceCost' => 1100,
            'powerKwh' => 4.0,
            'description' => 'Двухсекционный, 500 чашек в день'
        ],
        [
            'name' => 'WMF 1500 S',
            'price' => 850000,
            'rent' => 35000,
            'acquirerPercent' => 1.2,
            'maintenanceCost' => 5000,
            'serviceCost' => 1200,
            'powerKwh' => 4.5,
            'description' => 'Немецкое качество, 600 чашек в день'
        ],
        [
            'name' => 'Cimbali M100',
            'price' => 1200000,
            'rent' => 50000,
            'acquirerPercent' => 1.0,
            'maintenanceCost' => 6000,
            'serviceCost' => 1500,
            'powerKwh' => 5.5,
            'description' => 'Топовый автомат, 800 чашек в день'
        ]
    ];
    
    // ========== ПОСТАВЩИКИ (free_delivery_from — в единицах товара: кг, л, шт) ==========
    $suppliers = [
        [
            'id' => 1,
            'name' => 'ООО «ГЛОБАЛ»',
            'description' => 'Крупный поставщик кофе и чая',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 390,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'coffeeBeans', 'price' => 1600, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'teaHibiscus', 'price' => 550, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'teaBlack', 'price' => 750, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'teaGreen', 'price' => 850, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 2,
            'name' => '«Кофе-Маркет»',
            'description' => 'Специализированный поставщик зернового кофе',
            'delivery_time_min' => 60,
            'delivery_time_max' => 240,
            'delivery_cost' => 500,
            'free_delivery_from' => 3,
            'items' => [
                ['ingredient_id' => 'coffeeBeans', 'price' => 2000, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 3,
            'name' => '«МолПродукт»',
            'description' => 'Поставщик сухого молока',
            'delivery_time_min' => 45,
            'delivery_time_max' => 150,
            'delivery_cost' => 450,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'milkPowder', 'price' => 500, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 4,
            'name' => '«Сладкая жизнь»',
            'description' => 'Сахар, какао, шоколад',
            'delivery_time_min' => 60,
            'delivery_time_max' => 180,
            'delivery_cost' => 400,
            'free_delivery_from' => 10,
            'items' => [
                ['ingredient_id' => 'sugar', 'price' => 73, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'cocoa', 'price' => 588, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'chocolate', 'price' => 588, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 5,
            'name' => '«Сироп-Трейд»',
            'description' => 'Профессиональные сиропы',
            'delivery_time_min' => 30,
            'delivery_time_max' => 120,
            'delivery_cost' => 350,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'vanillaSyrup', 'price' => 800, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'nutSyrup', 'price' => 800, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'fruitSyrup', 'price' => 800, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л']
            ]
        ],
        [
            'id' => 6,
            'name' => '«БрендПак»',
            'description' => 'Расходные материалы',
            'delivery_time_min' => 60,
            'delivery_time_max' => 180,
            'delivery_cost' => 300,
            'free_delivery_from' => 500,
            'items' => [
                ['ingredient_id' => 'cups', 'price' => 3.50, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'lids', 'price' => 2.50, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'napkins', 'price' => 1.00, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'stirSticks', 'price' => 0.70, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт']
            ]
        ],
        [
            'id' => 7,
            'name' => '«Чайная лавка»',
            'description' => 'Чай оптом',
            'delivery_time_min' => 45,
            'delivery_time_max' => 150,
            'delivery_cost' => 400,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'teaHibiscus', 'price' => 600, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'teaBlack', 'price' => 800, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'teaGreen', 'price' => 900, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 8,
            'name' => '«Судогодская»',
            'description' => 'Артезианская вода 19л, идеально для кофемашин',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 300,
            'free_delivery_from' => 57,
            'items' => [
                ['ingredient_id' => 'water', 'price' => 9.58, 'min_quantity' => 1, 'pack_size' => 19, 'unit' => 'л']
            ]
        ],
        [
            'id' => 9,
            'name' => '«ВОДА 19»',
            'description' => 'Артезианская питьевая вода 19л, доставка бесплатно',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 0,
            'free_delivery_from' => 0,
            'items' => [
                ['ingredient_id' => 'water', 'price' => 19.47, 'min_quantity' => 1, 'pack_size' => 19, 'unit' => 'л']
            ]
        ],
        [
            'id' => 10,
            'name' => '«Живея (Jevea)»',
            'description' => 'Природная вода высшей категории, ПЭТ одноразовая',
            'delivery_time_min' => 60,
            'delivery_time_max' => 240,
            'delivery_cost' => 500,
            'free_delivery_from' => 57,
            'items' => [
                ['ingredient_id' => 'water', 'price' => 54.47, 'min_quantity' => 1, 'pack_size' => 19, 'unit' => 'л']
            ]
        ],
        [
            'id' => 11,
            'name' => '«Neela Springs»',
            'description' => 'Горная вода, хит продаж',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 0,
            'free_delivery_from' => 0,
            'items' => [
                ['ingredient_id' => 'water', 'price' => 25, 'min_quantity' => 1, 'pack_size' => 19, 'unit' => 'л']
            ]
        ],
        [
            'id' => 12,
            'name' => '«НАВЕКА»',
            'description' => 'Артезианская вода первой категории',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 300,
            'free_delivery_from' => 57,
            'items' => [
                ['ingredient_id' => 'water', 'price' => 30, 'min_quantity' => 1, 'pack_size' => 19, 'unit' => 'л']
            ]
        ],
        [
            'id' => 13,
            'name' => '«Кристалл»',
            'description' => 'Питьевая вода 19л без залога',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 300,
            'free_delivery_from' => 57,
            'items' => [
                ['ingredient_id' => 'water', 'price' => 11.58, 'min_quantity' => 1, 'pack_size' => 19, 'unit' => 'л']
            ]
        ],
        [
            'id' => 14,
            'name' => '«Молочный Мир»',
            'description' => 'Качественное сухое молоко для кофемашин',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 350,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'milkPowder', 'price' => 480, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 15,
            'name' => '«СухМолПродукт»',
            'description' => 'Сухое молоко оптом, скидки от 50 кг',
            'delivery_time_min' => 60,
            'delivery_time_max' => 240,
            'delivery_cost' => 600,
            'free_delivery_from' => 20,
            'items' => [
                ['ingredient_id' => 'milkPowder', 'price' => 450, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 16,
            'name' => '«Эко-Молоко»',
            'description' => 'Экологически чистое сухое молоко',
            'delivery_time_min' => 45,
            'delivery_time_max' => 200,
            'delivery_cost' => 400,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'milkPowder', 'price' => 520, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 17,
            'name' => '«Сахарный Мир»',
            'description' => 'Поставщик сахара оптом',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 350,
            'free_delivery_from' => 20,
            'items' => [
                ['ingredient_id' => 'sugar', 'price' => 68, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 18,
            'name' => '«Сладкий Опт»',
            'description' => 'Сахар, скидки от 50 кг',
            'delivery_time_min' => 45,
            'delivery_time_max' => 200,
            'delivery_cost' => 500,
            'free_delivery_from' => 30,
            'items' => [
                ['ingredient_id' => 'sugar', 'price' => 65, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 19,
            'name' => '«Какао-Трейд»',
            'description' => 'Профессиональный какао-порошок',
            'delivery_time_min' => 30,
            'delivery_time_max' => 150,
            'delivery_cost' => 400,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'cocoa', 'price' => 550, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'chocolate', 'price' => 550, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 20,
            'name' => '«Шоколадный Дом»',
            'description' => 'Натуральный шоколад и какао',
            'delivery_time_min' => 45,
            'delivery_time_max' => 180,
            'delivery_cost' => 450,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'cocoa', 'price' => 620, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'chocolate', 'price' => 620, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 21,
            'name' => '«Премиум Какао»',
            'description' => 'Элитные сорта какао и шоколада',
            'delivery_time_min' => 60,
            'delivery_time_max' => 240,
            'delivery_cost' => 600,
            'free_delivery_from' => 3,
            'items' => [
                ['ingredient_id' => 'cocoa', 'price' => 700, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг'],
                ['ingredient_id' => 'chocolate', 'price' => 700, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'кг']
            ]
        ],
        [
            'id' => 22,
            'name' => '«Сиропная Лавка»',
            'description' => 'Профессиональные сиропы для кофе',
            'delivery_time_min' => 30,
            'delivery_time_max' => 150,
            'delivery_cost' => 350,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'vanillaSyrup', 'price' => 750, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'nutSyrup', 'price' => 750, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'fruitSyrup', 'price' => 750, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л']
            ]
        ],
        [
            'id' => 23,
            'name' => '«Sweet Сиропы»',
            'description' => 'Широкий ассортимент сиропов',
            'delivery_time_min' => 45,
            'delivery_time_max' => 200,
            'delivery_cost' => 400,
            'free_delivery_from' => 5,
            'items' => [
                ['ingredient_id' => 'vanillaSyrup', 'price' => 820, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'nutSyrup', 'price' => 820, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'fruitSyrup', 'price' => 820, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л']
            ]
        ],
        [
            'id' => 24,
            'name' => '«Premium Сиропы»',
            'description' => 'Элитные сиропы для кофейни',
            'delivery_time_min' => 60,
            'delivery_time_max' => 240,
            'delivery_cost' => 500,
            'free_delivery_from' => 3,
            'items' => [
                ['ingredient_id' => 'vanillaSyrup', 'price' => 900, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'nutSyrup', 'price' => 900, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л'],
                ['ingredient_id' => 'fruitSyrup', 'price' => 900, 'min_quantity' => 1, 'pack_size' => 1, 'unit' => 'л']
            ]
        ],
        [
            'id' => 25,
            'name' => '«Пак-Сервис»',
            'description' => 'Расходные материалы для общепита',
            'delivery_time_min' => 30,
            'delivery_time_max' => 180,
            'delivery_cost' => 350,
            'free_delivery_from' => 500,
            'items' => [
                ['ingredient_id' => 'cups', 'price' => 3.20, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'lids', 'price' => 2.20, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'napkins', 'price' => 0.90, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'stirSticks', 'price' => 0.60, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт']
            ]
        ],
        [
            'id' => 26,
            'name' => '«Кофейный Стакан»',
            'description' => 'Стаканчики и крышки для кофе с собой',
            'delivery_time_min' => 30,
            'delivery_time_max' => 150,
            'delivery_cost' => 400,
            'free_delivery_from' => 500,
            'items' => [
                ['ingredient_id' => 'cups', 'price' => 3.80, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'lids', 'price' => 2.80, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт']
            ]
        ],
        [
            'id' => 27,
            'name' => '«Эко-Салфетки»',
            'description' => 'Экологичные салфетки и палочки',
            'delivery_time_min' => 45,
            'delivery_time_max' => 200,
            'delivery_cost' => 300,
            'free_delivery_from' => 500,
            'items' => [
                ['ingredient_id' => 'napkins', 'price' => 1.10, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'stirSticks', 'price' => 0.80, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт']
            ]
        ],
        [
            'id' => 28,
            'name' => '«ОптПосуд»',
            'description' => 'Крупный поставщик расходников',
            'delivery_time_min' => 60,
            'delivery_time_max' => 240,
            'delivery_cost' => 500,
            'free_delivery_from' => 1000,
            'items' => [
                ['ingredient_id' => 'cups', 'price' => 3.00, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'lids', 'price' => 2.00, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'napkins', 'price' => 0.80, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт'],
                ['ingredient_id' => 'stirSticks', 'price' => 0.55, 'min_quantity' => 1, 'pack_size' => 100, 'unit' => 'шт']
            ]
        ]
    ];
    
    return [
        'balance' => 50000,
        'totalIncomeEver' => 0,
        'totalExpenseEver' => 0,
        'totalCupsSold' => 0,
        'totalAcquirerFees' => 0,
        'totalTaxThisMonth' => 0,
        'totalTaxPaid' => 0,
        'realMachines' => $realMachines,
        'suppliers' => $suppliers,
        'orders' => [],
        'electricityRates' => [
            'summer1' => 6.43,
            'winter1' => 7.15,
            'summer2' => 9.18,
            'winter2' => 10.23,
            'summer3' => 11.05,
            'winter3' => 13.47
        ],
        'ingredients' => [
            ["id"=>"coffeeBeans","name"=>"🫘 Кофе зерновой","currentBuyPrice"=>1600,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>1600],
            ["id"=>"teaHibiscus","name"=>"🍺 Чай каркадэ растворимый","currentBuyPrice"=>600,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>600],
            ["id"=>"teaBlack","name"=>"🍂 Чай чёрный листовой","currentBuyPrice"=>800,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>800],
            ["id"=>"teaGreen","name"=>"🍃 Чай зелёный","currentBuyPrice"=>900,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>900],
            ["id"=>"water","name"=>"💧 Вода","currentBuyPrice"=>7,"unit"=>"л","stock"=>0,"type"=>"consumable","alertThreshold"=>5,"batches"=>[],"avgCost"=>7],
            ["id"=>"milkPowder","name"=>"🥛 Сухое молоко","currentBuyPrice"=>500,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>500],
            ["id"=>"sugar","name"=>"🍬 Сахар","currentBuyPrice"=>73,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>73],
            ["id"=>"chocolate","name"=>"🍫 Шоколад (порошок)","currentBuyPrice"=>588,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>588],
            ["id"=>"cocoa","name"=>"🍫 Какао-порошок","currentBuyPrice"=>588,"unit"=>"кг","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>588],
            ["id"=>"vanillaSyrup","name"=>"🍦 Сироп ванильный","currentBuyPrice"=>800,"unit"=>"л","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>800],
            ["id"=>"nutSyrup","name"=>"🌰 Сироп ореховый","currentBuyPrice"=>800,"unit"=>"л","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>800],
            ["id"=>"fruitSyrup","name"=>"🍓 Сироп фруктовый","currentBuyPrice"=>800,"unit"=>"л","stock"=>0,"type"=>"ingredient","alertThreshold"=>0.5,"batches"=>[],"avgCost"=>800],
            ["id"=>"stirSticks","name"=>"🥄 Палочки размешиватели","currentBuyPrice"=>0.70,"unit"=>"шт","stock"=>0,"type"=>"consumable","alertThreshold"=>20,"batches"=>[],"avgCost"=>0.70],
            ["id"=>"cups","name"=>"🥤 Стаканчики","currentBuyPrice"=>4.50,"unit"=>"шт","stock"=>0,"type"=>"consumable","alertThreshold"=>20,"batches"=>[],"avgCost"=>4.50],
            ["id"=>"lids","name"=>"🔘 Крышки","currentBuyPrice"=>2.50,"unit"=>"шт","stock"=>0,"type"=>"consumable","alertThreshold"=>20,"batches"=>[],"avgCost"=>2.50],
            ["id"=>"napkins","name"=>"🧻 Салфетки","currentBuyPrice"=>1.00,"unit"=>"шт","stock"=>0,"type"=>"consumable","alertThreshold"=>20,"batches"=>[],"avgCost"=>1.00]
        ],
        'drinks' => [
            ["id"=>"espresso","name"=>"Эспрессо","price"=>60,"recipe"=>["coffeeBeans"=>0.014,"water"=>0.07,"sugar"=>0.003]],
            ["id"=>"americano","name"=>"Американо","price"=>70,"recipe"=>["coffeeBeans"=>0.014,"water"=>0.22,"sugar"=>0.003]],
            ["id"=>"coffeeWithMilk","name"=>"Кофе с молоком","price"=>85,"recipe"=>["coffeeBeans"=>0.012,"water"=>0.12,"milkPowder"=>0.012,"sugar"=>0.005]],
            ["id"=>"cappuccino","name"=>"Капучино","price"=>90,"recipe"=>["coffeeBeans"=>0.012,"milkPowder"=>0.015,"water"=>0.08,"sugar"=>0.004]],
            ["id"=>"latte","name"=>"Латте","price"=>100,"recipe"=>["coffeeBeans"=>0.012,"milkPowder"=>0.018,"water"=>0.08,"sugar"=>0.004]],
            ["id"=>"cappuccinoChoco","name"=>"Капучино с шоколадом","price"=>100,"recipe"=>["coffeeBeans"=>0.012,"milkPowder"=>0.015,"water"=>0.08,"sugar"=>0.004,"chocolate"=>0.008]],
            ["id"=>"mochaccino","name"=>"Моккачино","price"=>100,"recipe"=>["coffeeBeans"=>0.012,"milkPowder"=>0.015,"water"=>0.08,"sugar"=>0.004,"chocolate"=>0.01]],
            ["id"=>"rafVanilla","name"=>"Раф ванильный","price"=>110,"recipe"=>["coffeeBeans"=>0.012,"milkPowder"=>0.02,"water"=>0.07,"sugar"=>0.003,"vanillaSyrup"=>0.007]],
            ["id"=>"rafNut","name"=>"Раф ореховый","price"=>110,"recipe"=>["coffeeBeans"=>0.012,"milkPowder"=>0.02,"water"=>0.07,"sugar"=>0.003,"nutSyrup"=>0.007]],
            ["id"=>"hotChocolate","name"=>"Горячий шоколад","price"=>80,"recipe"=>["chocolate"=>0.025,"milkPowder"=>0.02,"water"=>0.05,"sugar"=>0.005]],
            ["id"=>"doubleHotChocolate","name"=>"Двойной горячий шоколад","price"=>85,"recipe"=>["chocolate"=>0.05,"milkPowder"=>0.02,"water"=>0.05,"sugar"=>0.005]],
            ["id"=>"cocoaMilk","name"=>"Какао с молоком","price"=>90,"recipe"=>["cocoa"=>0.015,"milkPowder"=>0.02,"water"=>0.05,"sugar"=>0.005]],
            ["id"=>"mochaVanilla","name"=>"Мокко ванильный","price"=>75,"recipe"=>["coffeeBeans"=>0.01,"chocolate"=>0.008,"milkPowder"=>0.01,"water"=>0.07,"sugar"=>0.003,"vanillaSyrup"=>0.005]],
            ["id"=>"vanillaShake","name"=>"Ванильный коктейль","price"=>85,"recipe"=>["milkPowder"=>0.025,"water"=>0.1,"sugar"=>0.005,"vanillaSyrup"=>0.01]],
            ["id"=>"mochaNut","name"=>"Мокко ореховый","price"=>75,"recipe"=>["coffeeBeans"=>0.01,"chocolate"=>0.008,"milkPowder"=>0.01,"water"=>0.07,"sugar"=>0.003,"nutSyrup"=>0.005]],
            ["id"=>"nutShake","name"=>"Ореховый коктейль","price"=>85,"recipe"=>["milkPowder"=>0.025,"water"=>0.1,"sugar"=>0.005,"nutSyrup"=>0.01]],
            ["id"=>"doubleMochaNut","name"=>"Мокко ореховый двойной","price"=>85,"recipe"=>["coffeeBeans"=>0.01,"chocolate"=>0.016,"milkPowder"=>0.01,"water"=>0.07,"sugar"=>0.003,"nutSyrup"=>0.005]],
            ["id"=>"fruitDrink","name"=>"Фруктовый напиток","price"=>65,"recipe"=>["water"=>0.25,"sugar"=>0.004,"fruitSyrup"=>0.012]],
            ["id"=>"hibiscusTea","name"=>"Чай каркадэ","price"=>70,"recipe"=>["water"=>0.15,"sugar"=>0.005,"teaHibiscus"=>0.014]],
            ["id"=>"blackTea","name"=>"Чай чёрный","price"=>65,"recipe"=>["water"=>0.15,"sugar"=>0.005,"teaBlack"=>0.01]],
            ["id"=>"greenTea","name"=>"Чай зелёный","price"=>65,"recipe"=>["water"=>0.15,"sugar"=>0.005,"teaGreen"=>0.01]]
        ],
        'machines' => [],
        'machineCounter' => 1,
        'taxPercent' => 6,
        'transactions' => [],
        'transactionHistory' => [],
        'nextIngId' => 100,
        'nextDrinkId' => 100,
        'loans' => [],
        'maintenancePerMachine' => 1000,
        'amortizationPercent' => 1,
        'lastSyncTime' => null,
        'lastMonthProcessed' => null
    ];
}
?>