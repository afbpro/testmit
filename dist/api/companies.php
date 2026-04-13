<?php
// api/companies.php

declare(strict_types=1);

function handleCompaniesList(PDO $pdo): void
{
    requireLogin($pdo);

    $stmt = $pdo->query(
        'SELECT id, name, email, phone, address, phone1, phone2, mobile1, mobile2, web FROM company ORDER BY id DESC'
    );

    jsonResponse(200, [
        'ok' => true,
        'companies' => $stmt->fetchAll(),
    ]);
}
