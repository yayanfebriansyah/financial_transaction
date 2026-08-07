const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL belum diset di Environment Variables.');
}

const sql = neon(process.env.DATABASE_URL);

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (!process.env.DATABASE_URL) {
            return res.status(500).json({
                error: 'DATABASE_URL belum dikonfigurasi di Vercel.'
            });
        }

        if (req.method === 'GET') {
            const data = await sql`
                SELECT id, tanggal, jenis, kategori, nominal
                FROM transaksi
                ORDER BY tanggal DESC, id DESC
            `;
            return res.status(200).json(data);
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const { tanggal, jenis, kategori, nominal } = body;
            const nominalNumber = Number(nominal);

            if (!tanggal || !jenis || !kategori || !Number.isFinite(nominalNumber) || nominalNumber <= 0) {
                return res.status(400).json({
                    error: 'Data transaksi tidak lengkap atau nominal tidak valid.',
                    received: { tanggal, jenis, kategori, nominal }
                });
            }

            if (!['pemasukan', 'pengeluaran'].includes(jenis)) {
                return res.status(400).json({
                    error: 'Jenis transaksi harus pemasukan atau pengeluaran.'
                });
            }

            const result = await sql`
                INSERT INTO transaksi (tanggal, jenis, kategori, nominal)
                VALUES (${tanggal}, ${jenis}, ${kategori}, ${nominalNumber})
                RETURNING id, tanggal, jenis, kategori, nominal
            `;

            return res.status(201).json(result[0]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query || {};

            if (id) {
                await sql`DELETE FROM transaksi WHERE id = ${id}`;
                return res.status(200).json({
                    message: 'Transaksi berhasil dihapus'
                });
            }

            await sql`TRUNCATE TABLE transaksi RESTART IDENTITY`;
            return res.status(200).json({
                message: 'Semua data berhasil dihapus'
            });
        }

        return res.status(405).json({
            error: 'Method tidak diizinkan'
        });

    } catch (error) {
        console.error('Error Database:', error);
        return res.status(500).json({
            error: 'Gagal memproses ke database Neon.',
            detail: error.message
        });
    }
};
