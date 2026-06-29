import { snakeCase } from '@pondoknusa/support';

export { snakeCase };

export function singularSnakeCase(modelName: string): string {
  const snake = snakeCase(modelName);
  if (snake.endsWith('s')) {
    return snake.slice(0, -1);
  }
  return snake;
}