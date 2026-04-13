<?php
declare(strict_types=1);

function handleUsersList(PDO $pdo): void
{
    requireAdmin($pdo);

    $stmt = $pdo->query(
        'SELECT u.id, u.username, u.email, u.is_active, u.last_login_at, u.created_at, u.updated_at,
                u.rol_id, COALESCE(r.nombre, "usuario") AS role_name
         FROM `user` u
         LEFT JOIN role r ON r.id = u.rol_id
         ORDER BY u.id DESC'
    );

    jsonResponse(200, [
        'ok' => true,
        'users' => $stmt->fetchAll(),
    ]);
}

function handleRolesList(PDO $pdo): void
{
    requireAdmin($pdo);

    $stmt = $pdo->query('SELECT id, nombre, descripcion FROM role ORDER BY id ASC');

    jsonResponse(200, [
        'ok' => true,
        'roles' => $stmt->fetchAll(),
    ]);
}

function handleUsersCreate(PDO $pdo): void
{
    requireAdmin($pdo);
    $data = requireJsonBody();

    $username = trim((string) ($data['username'] ?? ''));
    $email = trim((string) ($data['email'] ?? ''));
    $password = (string) ($data['password'] ?? '');
    $rolId = (int) ($data['rol_id'] ?? 0);

    if ($username === '' || $email === '' || $password === '' || $rolId <= 0) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'username, email, password y rol_id son obligatorios.'
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'Email invalido.'
        ]);
    }

    if (strlen($password) < 6) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'La contraseña debe tener al menos 6 caracteres.'
        ]);
    }

    ensureRoleExists($pdo, $rolId);

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO `user` (username, email, password_hash, rol_id, is_active)
             VALUES (:username, :email, :password_hash, :rol_id, 1)'
        );
        $stmt->execute([
            'username' => $username,
            'email' => strtolower($email),
            'password_hash' => $passwordHash,
            'rol_id' => $rolId,
        ]);
    } catch (Throwable $e) {
        jsonResponse(409, [
            'ok' => false,
            'message' => 'No se pudo crear el usuario. Verifica email/username unicos.'
        ]);
    }

    jsonResponse(201, [
        'ok' => true,
        'message' => 'Usuario creado correctamente.'
    ]);
}

function handleUsersUpdate(PDO $pdo): void
{
    $currentUser = requireAdmin($pdo);
    $data = requireJsonBody();

    $id = (int) ($data['id'] ?? 0);
    $username = trim((string) ($data['username'] ?? ''));
    $email = trim((string) ($data['email'] ?? ''));
    $rolId = (int) ($data['rol_id'] ?? 0);
    $isActiveRaw = $data['is_active'] ?? null;
    $password = trim((string) ($data['password'] ?? ''));

    if ($id <= 0 || $username === '' || $email === '' || $rolId <= 0 || !is_numeric((string) $isActiveRaw)) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'id, username, email, rol_id e is_active son obligatorios.'
        ]);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'Email invalido.'
        ]);
    }

    $isActive = ((int) $isActiveRaw) === 1 ? 1 : 0;
    ensureRoleExists($pdo, $rolId);

    if ((int) $currentUser['id'] === $id && $isActive === 0) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'No podes desactivar tu propio usuario administrador.'
        ]);
    }

    $fields = [
        'username = :username',
        'email = :email',
        'rol_id = :rol_id',
        'is_active = :is_active',
    ];
    $params = [
        'id' => $id,
        'username' => $username,
        'email' => strtolower($email),
        'rol_id' => $rolId,
        'is_active' => $isActive,
    ];

    if ($password !== '') {
        if (strlen($password) < 6) {
            jsonResponse(422, [
                'ok' => false,
                'message' => 'La contraseña debe tener al menos 6 caracteres.'
            ]);
        }

        $fields[] = 'password_hash = :password_hash';
        $params['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
    }

    try {
        $stmt = $pdo->prepare(
            sprintf('UPDATE `user` SET %s WHERE id = :id', implode(', ', $fields))
        );
        $stmt->execute($params);
    } catch (Throwable $e) {
        jsonResponse(409, [
            'ok' => false,
            'message' => 'No se pudo actualizar el usuario. Verifica email/username unicos.'
        ]);
    }

    jsonResponse(200, [
        'ok' => true,
        'message' => 'Usuario actualizado correctamente.'
    ]);
}

function ensureRoleExists(PDO $pdo, int $rolId): void
{
    $stmt = $pdo->prepare('SELECT id FROM role WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $rolId]);

    if (!$stmt->fetch()) {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'El rol seleccionado no existe.'
        ]);
    }
}
