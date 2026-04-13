<?php
declare(strict_types=1);

function applyCorsHeaders(string $origin): void
{
    // Permitir CORS solo desde localhost (http y http://localhost:8080)
    $allowedOrigins = [
        'http://localhost',
        'http://localhost:8080',
        'http://127.0.0.1',
        'http://127.0.0.1:8080',
    ];
    if (in_array($origin, $allowedOrigins, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Session-Id');
    header('Access-Control-Max-Age: 600');
}

function resolveSessionIdFromHeader(): string
{
    $rawSessionId = trim((string) ($_SERVER['HTTP_X_SESSION_ID'] ?? ''));

    if ($rawSessionId === '') {
        return '';
    }

    // Keep strict validation for PHP session id format.
    if (preg_match('/^[A-Za-z0-9,-]{16,128}$/', $rawSessionId) !== 1) {
        return '';
    }

    return $rawSessionId;
}

function resolveAction(): string
{
    $fromQuery = trim((string) ($_GET['action'] ?? ''));
    if ($fromQuery !== '') {
        return strtolower($fromQuery);
    }

    $pathInfo = trim((string) ($_SERVER['PATH_INFO'] ?? ''), '/');
    if ($pathInfo !== '') {
        return str_replace('/', '-', strtolower($pathInfo));
    }

    $requestUri = trim((string) ($_SERVER['REQUEST_URI'] ?? ''));
    if ($requestUri === '') {
        return '';
    }

    $path = (string) parse_url($requestUri, PHP_URL_PATH);
    $path = trim($path, '/');

    if (preg_match('#^api/(.+)$#i', $path, $matches) === 1) {
        return str_replace('/', '-', strtolower($matches[1]));
    }

    return '';
}

function jsonResponse(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireJsonBody(): array
{
    $rawBody = file_get_contents('php://input');
    $data = json_decode((string) $rawBody, true);

    if (!is_array($data)) {
        jsonResponse(400, [
            'ok' => false,
            'message' => 'JSON invalido.'
        ]);
    }

    return $data;
}

function isAllowedOrigin(string $origin): bool
{
    if ($origin === '') {
        return false;
    }

    $parts = parse_url($origin);
    if (!is_array($parts)) {
        return false;
    }

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));

    if ($scheme === '' || $host === '') {
        return false;
    }

    if ($scheme === 'https' && $host === 'app.cupertino.uy') {
        return true;
    }

    if (($scheme === 'http' || $scheme === 'https') && ($host === 'localhost' || $host === '127.0.0.1')) {
        return true;
    }

    if (($scheme === 'http' || $scheme === 'https') && preg_match('/^192\.168\.1\.(\d{1,3})$/', $host, $matches) === 1) {
        $lastOctet = (int) $matches[1];
        return $lastOctet >= 0 && $lastOctet <= 255;
    }

    return false;
}
