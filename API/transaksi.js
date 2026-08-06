import { neon } = require('@neondatabase/serverless');

// Membaca kualifikasi dari Environment Variable Vercel (TIDAK ADA URL DI SINI)
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    // Pengaturan Header CORS agar frontend bisa mengakses API ini
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 1. GET: Ambil Semua Transaksi
        if (req.method === 'GET') {
            const data = await sql`SELECT * FROM transaksi ORDER BY tanggal DESC, id DESC`;
            return res.status(200).json(data);
        }

        // 2. POST: Tambah Transaksi
        if (req.method === 'POST') {
            const { tanggal, jenis, kategori, nominal } = req.body;
            const result = await sql`
                INSERT INTO transaksi (tanggal, jenis, kategori, nominal)
                VALUES (${tanggal}, ${jenis}, ${kategori}, ${nominal})
                RETURNING *
            `;
            return res.status(201).json(result[0]);
        }

        // 3. DELETE: Hapus Data
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (id) {
                // Hapus 1 Transaksi
                await sql`DELETE FROM transaksi WHERE id = ${id}`;
                return res.status(200).json({ message: 'Transaksi berhasil dihapus' });
            } else {
                // Reset Semua Data
                await sql`TRUNCATE TABLE transaksi`;
                return res.status(200).json({ message: 'Semua data berhasil dihapus' });
            }
        }

        return res.status(405).json({ error: 'Method tidak diizinkan' });
    } catch (error) {
        console.error('Error Database:', error);
        return res.status(500).json({ error: 'Gagal memproses ke database Neon' });
    }
}