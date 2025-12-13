// Simple test to check if Player class works
import { Player } from './src/core/player.js';

try {
    const player = new Player(100, 100);
    } catch (error) {
    console.error('Error loading Player class:', error);
}
