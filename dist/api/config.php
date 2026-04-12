<?php
declare(strict_types=1);

function loadDatabaseConfig(): array
{
    $defaults = [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'n8cupertino_db',
        'user' => 'root',
        'pass' => '',
    ];

    $envCandidates = [
        dirname(__DIR__) . '/../app/colega-linker-db.env',
        dirname(dirname(__DIR__)) . '/app/colega-linker-db.env',
    ];

    foreach ($envCandidates as $envPath) {
        if (!is_readable($envPath)) {
            continue;
        }

        $parsed = parse_ini_file($envPath, false, INI_SCANNER_RAW);
        if (!is_array($parsed)) {
            continue;
        }

        $host = trim((string) ($parsed['DB_HOST'] ?? $defaults['host']));
        $name = trim((string) ($parsed['DB_NAME'] ?? $defaults['name']));
        $user = trim((string) ($parsed['DB_USER'] ?? $defaults['user']));
        $pass = (string) ($parsed['DB_PASS'] ?? $defaults['pass']);
        $portRaw = (string) ($parsed['DB_PORT'] ?? (string) $defaults['port']);
        $port = ctype_digit($portRaw) ? (int) $portRaw : $defaults['port'];

        return [
            'host' => $host !== '' ? $host : $defaults['host'],
            'port' => $port,
            'name' => $name !== '' ? $name : $defaults['name'],
            'user' => $user !== '' ? $user : $defaults['user'],
            'pass' => $pass,
        ];
    }

    return $defaults;
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
