# เว็บไซต์สมาคมธุรกิจท่องเที่ยวเมืองเขลางค์นคร

## พัฒนาและตรวจสอบ

ใช้ Node.js 20 ขึ้นไป ไม่ต้องติดตั้ง npm dependencies

```sh
npm run build
npm test
python3 -m http.server 8000 --directory dist --bind 127.0.0.1
```

ต้องเปิดจาก `dist` หลัง build เพราะรายการกิจกรรมถูกสร้างที่ `content/events-index.json` ห้ามเปิดไฟล์ HTML ผ่าน file:// โดยตรง

## Cloudflare Pages

ตั้งค่า Framework preset: None, Build command: `npm run build`, Build output directory: `dist` และ Production branch: `main` (root directory คือราก repository) เปิด automatic deployments สำหรับ commit ใหม่บน main

เมื่อ CMS เผยแพร่ จะ commit JSON/รูปเข้า GitHub จากนั้น Cloudflare build รายการกิจกรรมและ deploy เว็บไซต์เป็นชุดเดียวกัน จึงไม่ต้องใช้ GitHub API จากเบราว์เซอร์ และไม่เจอปัญหาข้อมูลใหม่แต่ไฟล์ภาพยังไม่ deploy ต้องรอ deployment สำเร็จก่อนข้อมูลจะแสดง

## ผู้ดูแล

เปิด `/admin/` → เข้าสู่ระบบ GitHub → กิจกรรมและข่าวสาร → เพิ่มกิจกรรม เลือกรูปปก กรอกเรื่องย่อ เนื้อหา และภาพเพิ่มเติม ตรวจพรีวิวก่อนเผยแพร่

หน้าแรกแสดง 6 รายการเรียงตามวันที่จัดกิจกรรมล่าสุด หน้า Events แสดงทุกรายการ กิจกรรมเก่า 1–6 ถูกย้ายเป็น JSON พร้อมข้อความและแกลเลอรีแล้ว ลิงก์เก่าแบบ `?file=ชื่อไฟล์.md` ยังเปิดได้

OAuth Worker เดิมยังใช้ต่อ ผู้ใช้ต้องมีสิทธิ์เขียน repository หากเปลี่ยนโดเมนต้องตรวจ OAuth redirect/origin ที่ Worker และ GitHub OAuth App ด้วย ค่า `site_url` ใน admin/config.yml ยังใช้โดเมน pages.dev เดิม เนื่องจากยังไม่ทราบ custom domain

รายการชื่อ `test` ยังเก็บไว้เพื่อไม่ลบข้อมูลผู้ใช้ ผู้ดูแลสามารถลบผ่าน CMS หากไม่ต้องการเผยแพร่

พรีวิวหลังบ้านแสดงข้อความและภาพจากแบบฟอร์มที่ยังไม่บันทึก ส่วนลิงก์ดูบนเว็บไซต์จะแสดงเวอร์ชันที่ deploy แล้ว การเข้าสู่ระบบ OAuth และการเผยแพร่จริงต้องตรวจบน Cloudflare หลังนำการแก้ไขขึ้น GitHub
