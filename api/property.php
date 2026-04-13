<?php
// api/property.php

declare(strict_types=1);

function handlePropertyList(PDO $pdo): void
{
    requireLogin($pdo);

    $type = $_POST['type'] ?? null;
    if ($type !== null && $type !== '' && $type !== 'all') {
        $stmt = $pdo->prepare('SELECT * FROM tera WHERE type = :type ORDER BY id DESC');
        $stmt->execute(['type' => $type]);
    } else {
        $stmt = $pdo->query('SELECT * FROM tera ORDER BY id DESC');
    }
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse(200, [
        'ok' => true,
        'properties' => $properties,
    ]);
}
