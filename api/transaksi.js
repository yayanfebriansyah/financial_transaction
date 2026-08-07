const { neon }=require('@neondatabase/serverless');
const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');
const sql=neon(process.env.DATABASE_URL),COOKIE='catatan_session',AGE=604800;
const json=(r,s,d)=>r.status(s).json(d);
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{let i=x.indexOf('=');return[x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1).trim())]}))}
function user(req){try{return jwt.verify(cookies(req)[COOKIE],process.env.JWT_SECRET)}catch{return null}}
module.exports=async(req,res)=>{
res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS,POST,DELETE');res.setHeader('Access-Control-Allow-Headers','Content-Type');
if(req.method==='OPTIONS')return res.status(200).end();
try{
if(!process.env.DATABASE_URL)return json(res,500,{error:'DATABASE_URL belum dikonfigurasi di Vercel.'});
if(!process.env.JWT_SECRET)return json(res,500,{error:'JWT_SECRET belum dikonfigurasi di Vercel.'});
const a=req.query?.action;
if(a==='register'&&req.method==='POST'){let {username,password}=req.body||{};username=String(username||'').trim();if(!/^[A-Za-z0-9_.-]{3,50}$/.test(username))return json(res,400,{error:'Username 3-50 karakter: huruf, angka, titik, underscore, minus.'});if(typeof password!=='string'||password.length<8)return json(res,400,{error:'Password minimal 8 karakter.'});if((await sql`SELECT id FROM users WHERE username=${username} LIMIT 1`).length)return json(res,409,{error:'Username sudah digunakan.'});let h=await bcrypt.hash(password,12);await sql`INSERT INTO users(username,password_hash) VALUES(${username},${h})`;return json(res,201,{message:'Akun berhasil dibuat.'})}
if(a==='login'&&req.method==='POST'){let {username,password}=req.body||{};let q=await sql`SELECT id,username,password_hash FROM users WHERE username=${String(username||'').trim()} LIMIT 1`;if(!q.length||!(await bcrypt.compare(String(password||''),q[0].password_hash)))return json(res,401,{error:'Username atau password salah.'});let t=jwt.sign({id:q[0].id,username:q[0].username},process.env.JWT_SECRET,{expiresIn:AGE});res.setHeader('Set-Cookie',`${COOKIE}=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${AGE}; Secure`);return json(res,200,{username:q[0].username})}
if(a==='change_password'&&req.method==='POST'){let {oldPassword,newPassword}=req.body||{};if(typeof oldPassword!=='string'||typeof newPassword!=='string'||newPassword.length<8)return json(res,400,{error:'Password baru minimal 8 karakter.'});let q=await sql`SELECT password_hash FROM users WHERE id=${user(req).id} LIMIT 1`;if(!q.length||!(await bcrypt.compare(oldPassword,q[0].password_hash)))return json(res,401,{error:'Password lama salah.'});if(oldPassword===newPassword)return json(res,400,{error:'Password baru harus berbeda dari password lama.'});let h=await bcrypt.hash(newPassword,12);await sql`UPDATE users SET password_hash=${h} WHERE id=${user(req).id}`;return json(res,200,{message:'Password berhasil diganti.'})}
if(a==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);return json(res,200,{message:'Logout berhasil'})}
if(a==='me'&&req.method==='GET'){let u=user(req);return u?json(res,200,u):json(res,401,{error:'Belum login'})}
let u=user(req);if(!u)return json(res,401,{error:'Sesi tidak valid atau sudah berakhir.'});
if(req.method==='GET')return json(res,200,await sql`SELECT id,tanggal,jenis,kategori,nominal FROM transaksi WHERE user_id=${u.id} ORDER BY tanggal DESC,id DESC`);
if(req.method==='POST'){let {tanggal,jenis,kategori,nominal}=req.body||{},n=Number(nominal);if(!tanggal||!kategori||!['pemasukan','pengeluaran'].includes(jenis)||!Number.isFinite(n)||n<=0)return json(res,400,{error:'Data transaksi tidak lengkap atau nominal tidak valid.'});let q=await sql`INSERT INTO transaksi(user_id,tanggal,jenis,kategori,nominal) VALUES(${u.id},${tanggal},${jenis},${kategori},${n}) RETURNING id,tanggal,jenis,kategori,nominal`;return json(res,201,q[0])}
if(a==='delete_account'&&req.method==='POST'){if((req.body||{}).confirmation!=='HAPUS')return json(res,400,{error:'Konfirmasi penghapusan tidak valid.'});await sql`DELETE FROM transaksi WHERE user_id=${user(req).id}`;await sql`DELETE FROM users WHERE id=${user(req).id}`;res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);return json(res,200,{message:'Akun berhasil dihapus.'})}
if(req.method==='DELETE'){let id=req.query?.id;if(id)await sql`DELETE FROM transaksi WHERE id=${id} AND user_id=${u.id}`;else await sql`DELETE FROM transaksi WHERE user_id=${u.id}`;return json(res,200,{message:'Berhasil'})}
return json(res,405,{error:'Method tidak diizinkan'})
}catch(e){console.error(e);return json(res,500,{error:'Gagal memproses permintaan.',detail:e.message})}};
