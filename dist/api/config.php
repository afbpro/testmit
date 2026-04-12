<?php
declare(strict_types=1);

function loadDatabaseConfig(): array
{
    return  [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'n8cupertino_db',
        'user' => 'n8cupertino_app',
        'pass' => '#h*gnp]_Bk#Et!OC',
    ];
}

function createPdo(array $dbConfig): PDO
{
    return new PDO(
        sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $dbConfig['host'],
            (int) $dbConfig['port'],
            $dbConfig['name']
        ),
        $dbConfig['user'],
        $dbConfig['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}
