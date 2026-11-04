<?php
require_once __DIR__ . '/config.php';
class DB {
    private static ?PDO $pdo = null;
    public static function pdo(): PDO {
        if (self::$pdo === null) {
            $dsn = "mysql:host=".DB_HOST.";port=".DB_PORT.";dbname=".DB_NAME.";charset=".DB_CHARSET;
            $opts = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
                     PDO::ATTR_EMULATE_PREPARES=>false, PDO::MYSQL_ATTR_INIT_COMMAND=>"SET time_zone='+07:00'"];
            try { self::$pdo = new PDO($dsn, DB_USER, DB_PASS, $opts); }
            catch (PDOException $e) {
                http_response_code(503);
                echo json_encode(['success'=>false,'message'=>APP_DEBUG?'DB error: '.$e->getMessage():'Service unavailable.']);
                exit;
            }
        }
        return self::$pdo;
    }
    public static function fetchAll(string $sql, array $p=[]): array { $s=self::pdo()->prepare($sql); $s->execute($p); return $s->fetchAll(); }
    public static function fetchOne(string $sql, array $p=[]): ?array { $s=self::pdo()->prepare($sql); $s->execute($p); return $s->fetch()?:null; }
    public static function execute(string $sql, array $p=[]): int { $s=self::pdo()->prepare($sql); $s->execute($p); $id=(int)self::pdo()->lastInsertId(); return $id?:$s->rowCount(); }
}
