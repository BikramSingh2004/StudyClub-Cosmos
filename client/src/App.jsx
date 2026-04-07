import { useState } from 'react';
import JoinScreen from './components/JoinScreen';
import Cosmos from './components/Cosmos';

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <JoinScreen onJoin={setUser} />;
  }

  return <Cosmos username={user.username} avatarColor={user.avatarColor} />;
}
