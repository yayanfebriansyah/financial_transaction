import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const data = await sql`SELECT * FROM transaksi ORDER BY tanggal DESC, id DESC`;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const { tanggal, jenis, kategori, nominal } = req.body;
            const result = await sql`
                INSERT INTO transaksi (tanggal, jenis, kategori, nominal)
                VALUES (${tanggal}, ${jenis}, ${kategori}, ${nominal})
                RETURNING *
            `;
            return res.status(201).json(result[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (id) {
                await sql`DELETE FROM transaksi WHERE id = ${id}`;
                return res.status(200).json({ message: 'Transaksi berhasil dihapus' });
            } else {
                await sql`TRUNCATE TABLE transaksi`;
                return res.status(200).json({ message: 'Semua data berhasil dihapus' });
            }
        }

        return res.status(405).json({ error: 'Method tidak diizinkan' });
    } catch (error) {
        console.error('Error Database:', error);
        return res.status(500).json({ error: error.message || 'Gagal memproses ke database Neon' });
    }
}