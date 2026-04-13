<?php
// api/companies.php

declare(strict_types=1);

function handleCompaniesList(PDO $pdo): void
{
    requireLogin($pdo);


    $stmt = $pdo->query(
        'SELECT id, name, address, phone1, phone2, email, web, city, country FROM company ORDER BY id DESC'
    );

    jsonResponse(200, [
        'ok' => true,
        'companies' => $stmt->fetchAll(),
    ]);
}
