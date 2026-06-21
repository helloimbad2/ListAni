import { GENRES } from '../types';
import clsx from 'clsx';

interface Props {
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function GenreFilter({ selected, onChange }: Props) {
  const toggle = (id: number) => {
    onChange(selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange([])}
        className={clsx('genre-pill px-3 py-1 rounded-full text-xs font-600 font-display transition-all', selected.length === 0 && 'active')}
      >
        All
      </button>
      {GENRES.map((g, i) => (
        <button
          key={`${g.id}-${i}`}
          onClick={() => toggle(g.id)}
          className={clsx('genre-pill px-3 py-1 rounded-full text-xs font-600 font-display transition-all', selected.includes(g.id) && 'active')}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}
