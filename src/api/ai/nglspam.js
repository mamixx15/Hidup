import express from 'express';
import axios from 'axios';
import { URL } from 'url';
import crypto from 'crypto';

export default function(app) {

  async function extractUsername(nglUrl) {
    try {
      const parsedUrl = new URL(nglUrl);
      if (parsedUrl.hostname !== 'ngl.link') {
        throw new Error('URL harus dari domain ngl.link');
      }
      return parsedUrl.pathname.split('/')[1];
    } catch (error) {
      throw new Error('Format URL tidak valid');
    }
  }

  async function kirimNGL(nglUrl, pesan, jumlah) {
    try {
      if (!nglUrl) throw new Error('URL NGL harus diisi');
      if (!pesan) throw new Error('Pesan tidak boleh kosong');
      if (!jumlah || jumlah < 1) throw new Error('Jumlah pengiriman minimal 1');

      const username = await extractUsername(nglUrl);
      if (!username) throw new Error('Tidak bisa mengekstrak username dari URL');

      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      const randomDelay = () => delay(1000 + Math.random() * 2000);

      const results = [];

      for (let i = 0; i < jumlah; i++) {
        const data = new URLSearchParams();
        data.append('username', username);
        data.append('question', pesan);
        data.append('deviceId', crypto.randomUUID());

        try {
          const response = await axios.post('https://ngl.link/api/submit', data.toString(), {
            headers: {
              'accept': '*/*',
              'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
            }
          });

          results.push({
            attempt: i + 1,
            status: 'success',
            response: response.data
          });

          console.log(`[${i + 1}/${jumlah}] Terkirim ke ${username}`);
          await randomDelay();

        } catch (err) {
          results.push({
            attempt: i + 1,
            status: 'failed',
            error: err.message
          });
          console.error(`Gagal kirim pesan ke-${i + 1}:`, err.message);
          await delay(3000);
        }
      }

      return {
        status: true,
        message: `Berhasil mengirim ${results.filter(r => r.status === 'success').length} dari ${jumlah} pesan`,
        details: {
          username,
          pesan,
          ngl_url: nglUrl,
          hasil_pengiriman: results,
          selesai_pada: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error NGL Spammer:', error);
      throw new Error(`Gagal mengirim pesan: ${error.message}`);
    }
  }

  app.get('/ai/spam-ngl', async (req, res) => {
    try {
      const { url, pesan, jumlah } = req.query;

      if (!url || !pesan || !jumlah) {
        return res.status(400).json({
          status: false,
          error: 'Parameter url, pesan, dan jumlah harus diisi'
        });
      }

      const jumlahInt = parseInt(jumlah);
      if (isNaN(jumlahInt)) {
        return res.status(400).json({
          status: false,
          error: 'Jumlah harus berupa angka'
        });
      }

      const result = await kirimNGL(url, pesan, jumlahInt);
      res.status(200).json(result);

    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message,
        saran: 'Pastikan URL format: https://ngl.link/username'
      });
    }
  });
}
