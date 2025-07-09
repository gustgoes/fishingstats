const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');

envFile.split('\n').forEach(line => {
    if (line) {
        const [key, value] = line.split('=');
        process.env[key] = value.trim();
    }
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    try {
        const { data: players, error } = await supabase
            .from('ranking')
            .select('username, hotel, updatedat')
            .eq('level', 99)
            .order('updatedat', { ascending: true });

        if (error) throw error;

        const achieversByHotel = {};

        for (const player of players) {
            if (!achieversByHotel[player.hotel]) {
                achieversByHotel[player.hotel] = [];
            }
            achieversByHotel[player.hotel].push(player);
        }

        for (const hotel in achieversByHotel) {
            const hotelPlayers = achieversByHotel[hotel];
            for (let i = 0; i < hotelPlayers.length; i++) {
                const player = hotelPlayers[i];
                const rank = i + 1;

                const { data: existingAchiever } = await supabase
                    .from('level_99_achievers')
                    .select('username')
                    .eq('username', player.username.toLowerCase())
                    .eq('hotel', player.hotel)
                    .single();

                if (!existingAchiever) {
                    console.log(`Adding ${player.username} (${player.hotel}) with rank ${rank}`);
                    await supabase.from('level_99_achievers').insert({
                        username: player.username.toLowerCase(),
                        hotel: player.hotel,
                        rank: rank,
                        achieved_at: player.updatedat
                    });
                }
            }
        }

        console.log('Backfill complete!');
    } catch (error) {
        console.error('Error during backfill:', error);
    }
}

backfill();
