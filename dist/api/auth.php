<?php
declare(strict_types=1);



function handleLogin(PDO $pdo): void
{
    $data = requireJsonBody();

    $email = trim((string) ($data['email'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if ($email === '' || $password === '') {
        jsonResponse(422, [
            'ok' => false,
            'message' => 'email y password son obligatorios.'
        ]);
    }

    $stmt = $pdo->prepare(
        'SELECT u.id, u.username, u.email, u.password_hash, u.is_active, COALESCE(r.nombre, "usuario") AS role_name
         FROM `user` u
         LEFT JOIN role r ON r.id = u.rol_id
         WHERE u.email = :email
         LIMIT 1'
    );
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || (int) $user['is_active'] !== 1) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'Credenciales invalidas.'
        ]);
    }

    if (!password_verify($password, (string) $user['password_hash'])) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'Credenciales invalidas.'
        ]);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['username'] = (string) $user['username'];
    $_SESSION['email'] = (string) $user['email'];
    $_SESSION['role'] = (string) $user['role_name'];
    $_SESSION['logged_in'] = true;

    $update = $pdo->prepare('UPDATE `user` SET last_login_at = NOW() WHERE id = :id');
    $update->execute(['id' => (int) $user['id']]);

    jsonResponse(200, [
        'ok' => true,
        'message' => 'Login correcto.',
        'session_id' => session_id(),
        'user' => [
            'id' => (int) $user['id'],
            'username' => (string) $user['username'],
            'email' => (string) $user['email'],
            'role' => (string) $user['role_name']
        ]
    ]);
}

function handleLogout(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();

    jsonResponse(200, [
        'ok' => true,
        'message' => 'Logout correcto.'
    ]);
}

function requireLogin(PDO $pdo): array
{
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    $loggedIn = (bool) ($_SESSION['logged_in'] ?? false);

    if ($userId <= 0 || !$loggedIn) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'Sesion no valida.'
        ]);
    }

     $stmt = $pdo->prepare(
        'SELECT u.id, u.is_active, u.rol_id
         FROM `user` u
         WHERE u.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $userId]);
    $current = $stmt->fetch();

    if (!$current || (int) $current['is_active'] !== 1) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'Sesion no valida.'
        ]);
    }

    return $current;
}

function requireAdmin(PDO $pdo): array
{
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    $loggedIn = (bool) ($_SESSION['logged_in'] ?? false);

    if ($userId <= 0 || !$loggedIn) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'Sesion no valida.'
        ]);
    }

    $stmt = $pdo->prepare(
        'SELECT u.id, u.is_active, u.rol_id
         FROM `user` u
         WHERE u.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $userId]);
    $current = $stmt->fetch();

    if (!$current || (int) $current['is_active'] !== 1) {
        jsonResponse(401, [
            'ok' => false,
            'message' => 'Sesion no valida.'
        ]);
    }

    if ((int) $current['rol_id'] !== 1) {
        jsonResponse(403, [
            'ok' => false,
            'message' => 'Solo un administrador puede ejecutar esta accion.'
        ]);
    }

    return $current;
}
