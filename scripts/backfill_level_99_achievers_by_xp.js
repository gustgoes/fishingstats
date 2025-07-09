const { createClient } = require('@supabase/supabase-js');
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

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    try {
        await supabase.from('level_99_achievers').delete().neq('id', 0); // Clear the table

        const { data: players, error } = await supabase
            .from('xp_history')
            .select('username, hotel, logged_at')
            .eq('level', 99)
            .order('logged_at', { ascending: true });

        if (error) throw error;

        const achieversByHotel = {};
        const globalAchievers = [];

        for (const player of players) {
            if (!achieversByHotel[player.hotel]) {
                achieversByHotel[player.hotel] = [];
            }

            if (!achieversByHotel[player.hotel].find(p => p.username === player.username)) {
                achieversByHotel[player.hotel].push(player);
            }

            if (!globalAchievers.find(p => p.username === player.username && p.hotel === player.hotel)) {
                globalAchievers.push(player);
            }
        }

        for (const hotel in achieversByHotel) {
            const hotelPlayers = achieversByHotel[hotel];
            for (let i = 0; i < hotelPlayers.length; i++) {
                const player = hotelPlayers[i];
                const rank = i + 1;

                console.log(`Adding ${player.username} (${player.hotel}) with hotel_rank ${rank}`);
                await supabase.from('level_99_achievers').insert({
                    username: player.username.toLowerCase(),
                    hotel: player.hotel,
                    hotel_rank: rank,
                    achieved_at: player.logged_at
                });
            }
        }

        for (let i = 0; i < globalAchievers.length; i++) {
            const player = globalAchievers[i];
            const rank = i + 1;

            console.log(`Updating ${player.username} (${player.hotel}) with global_rank ${rank}`);
            await supabase
                .from('level_99_achievers')
                .update({ global_rank: rank })
                .eq('username', player.username.toLowerCase())
                .eq('hotel', player.hotel);
        }

        console.log('Backfill complete!');
    } catch (error) {
        console.error('Error during backfill:', error);
    }
}

backfill();
