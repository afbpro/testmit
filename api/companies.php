<?php
// api/companies.php

declare(strict_types=1);

function handleCompaniesList(PDO $pdo): void
{
    requireLogin($pdo);

    $stmt = $pdo->query(
        'SELECT id, nombre, email, telefono, direccion, created_at, updated_at FROM company ORDER BY id DESC'
    );

    jsonResponse(200, [
        'ok' => true,
        'companies' => $stmt->fetchAll(),
    ]);
}
