import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // 1. Pengaturan Header CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Tangani preflight request dari browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Cek ketersediaan DATABASE_URL di Environment Variable Vercel
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({ 
            error: 'DATABASE_URL belum dikonfigurasi di Environment Variables Vercel!' 
        });
    }

    try {
        // Inisialisasi koneksi Neon
        const sql = neon(process.env.DATABASE_URL);

        // -------------------------------------------------------------
        // A. GET: Ambil Semua Transaksi
        // -------------------------------------------------------------
        if (req.method === 'GET') {
            const data = await sql`
                SELECT id, tanggal, jenis, kategori, nominal 
                FROM transaksi 
                ORDER BY tanggal DESC, id DESC
            `;
            return res.status(200).json(data);
        }

        // -------------------------------------------------------------
        // B. POST: Tambah Transaksi Baru
        // -------------------------------------------------------------
        if (req.method === 'POST') {
            const { tanggal, jenis, kategori, nominal } = req.body || {};

            // Validasi sederhana input data
            if (!tanggal || !jenis || !kategori || nominal === undefined) {
                return res.status(400).json({ error: 'Data yang dikirim tidak lengkap!' });
            }

            const result = await sql`
                INSERT INTO transaksi (tanggal, jenis, kategori, nominal)
                VALUES (${tanggal}, ${jenis}, ${kategori}, ${Number(nominal)})
                RETURNING *
            `;
            return res.status(201).json(result[0]);
        }

        // -------------------------------------------------------------
        // C. DELETE: Hapus Data (1 baris atau Reset Semua)
        // -------------------------------------------------------------
        if (req.method === 'DELETE') {
            const { id } = req.query;

            if (id) {
                // Hapus 1 transaksi berdasarkan ID
                await sql`DELETE FROM transaksi WHERE id = ${id}`;
                return res.status(200).json({ message: 'Transaksi berhasil dihapus' });
            } else {
                // Reset/Kosongkan seluruh isi tabel
                await sql`TRUNCATE TABLE transaksi`;
                return res.status(200).json({ message: 'Semua data berhasil dihapus' });
            }
        }

        // Method tidak didukung
        return res.status(405).json({ error: `Method ${req.method} tidak diizinkan` });

    } catch (error) {
        console.error('Error Database Neon:', error);
        
        // Mengirimkan pesan rinci dari Neon ke frontend untuk mempermudah debugging
        return res.status(500).json({ 
            error: error.message || 'Terjadi kesalahan pada database Neon' 
        });
    }
}
