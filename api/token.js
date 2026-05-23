export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { room, identity, isGuide } = req.query;
    if (!room || !identity) return res.status(400).json({ error: "Missing room or identity" });

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) return res.status(500).json({ error: "Server configuration error" });

    const { AccessToken } = await import('livekit-server-sdk');
    try {
        const at = new AccessToken(apiKey, apiSecret, { identity: identity, ttl: '24h' });
        at.addGrant({
            roomJoin: true,
            room: room,
            canPublish: isGuide === 'true',
            canSubscribe: true
        });
        const token = await at.toJwt();
        return res.status(200).json({ token });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}