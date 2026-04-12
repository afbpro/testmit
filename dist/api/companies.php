<?php
// api/companies.php

declare(strict_types=1);

function handleCompaniesList(PDO $pdo): void
{
    // Cualquier usuario logueado puede ver el listado de inmobiliarias
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'No autorizado.'
        ]);
    }

    $stmt = $pdo->query(
        'SELECT id, nombre, email, telefono, direccion, created_at, updated_at FROM company ORDER BY id DESC'
    );

    jsonResponse(200, [
        'ok' => true,
        'companies' => $stmt->fetchAll(),
    ]);
}
