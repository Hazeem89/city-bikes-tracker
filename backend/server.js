import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());

let stations = [];

async function fetchSwedenStations() {
  try {
    const networksRes = await fetch('http://api.citybik.es/v2/networks');
    const networksData = await networksRes.json();

    if (!networksData.networks) {
      console.error('Unexpected API response:', JSON.stringify(networksData).slice(0, 300));
      return;
    }

    const swedenNetworks = networksData.networks.filter(n => n.location.country === 'SE');

    const results = await Promise.all(
      swedenNetworks.map(async (network) => {
        const res = await fetch(`http://api.citybik.es/v2/networks/${network.id}`);
        const { network: full } = await res.json();
        return full.stations.map(s => ({
          id: `${network.id}::${s.id}`,
          networkId: network.id,
          networkName: network.name,
          city: network.location.city,
          name: s.name,
          lat: s.latitude,
          lng: s.longitude,
          freeBikes: s.free_bikes ?? 0,
          emptySlots: s.empty_slots ?? 0,
          updatedAt: s.timestamp,
        }));
      })
    );

    stations = results.flat();
    io.emit('stations', stations);
    console.log(`[${new Date().toISOString()}] Updated: ${stations.length} stations across ${swedenNetworks.length} networks`);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

app.get('/api/stations', (_req, res) => res.json(stations));

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.emit('stations', stations);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

fetchSwedenStations();
setInterval(fetchSwedenStations, 5 * 60_000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
