<?php
$host     = getenv('MYSQLHOST') ?: 'localhost';
$user     = getenv('MYSQLUSER') ?: 'root';
$password = getenv('MYSQLPASSWORD') ?: '';
$database = getenv('MYSQLDATABASE') ?: 'terasmatrix';
$port     = getenv('MYSQLPORT') ?: '3306';

$conn = new mysqli($host, $user, $password, $database, $port);

if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

// Cari file database .sql kamu
$sql_files = glob("*.sql");
if (empty($sql_files)) {
    $sql_files = glob("backend/*.sql");
}

if (empty($sql_files)) {
    die("File .sql tidak ditemukan di folder project! Pastikan file .sql kamu sudah dimasukkan ke folder project.");
}

$sql_file = $sql_files[0];
$sql = file_get_contents($sql_file);

if ($conn->multi_query($sql)) {
    echo "<h1>BERHASIL!</h1><p>Tabel dari file '$sql_file' berhasil diimpor ke MySQL Railway.</p>";
} else {
    echo "<h1>GAGAL IMPOR:</h1> " . $conn->error;
}
?>