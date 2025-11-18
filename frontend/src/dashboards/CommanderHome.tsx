import type { FC } from 'react';
import type { SessionUser } from '../types';

type Props = {
  user?: SessionUser;
};

const CommanderHome: FC<Props> = () => {
  return (
    <div className="commander-home" style={{ width: '100%' }}>
      <section style={{ padding: '2rem' }}>
        <h2>Commander Home</h2>
        <p>This is a placeholder Commander home page. Add widgets here.</p>
      </section>
    </div>
  );
};

export default CommanderHome;
