import './styles.css';
import { NinjaGame } from './game/NinjaGame';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Nie znaleziono elementu canvas #game');

const game = new NinjaGame(canvas);
game.start();

document.querySelector<HTMLButtonElement>('#restart')?.addEventListener('click', () => {
  game.dispose();
  window.location.reload();
});
