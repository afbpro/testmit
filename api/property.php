<?php
// api/property.php

declare(strict_types=1);

function handlePropertyList(PDO $pdo): void
{
    requireLogin($pdo);

    $stmt = $pdo->query('SELECT * FROM tera ORDER BY id DESC');
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse(200, [
        'ok' => true,
        'properties' => $properties,
    ]);
}
