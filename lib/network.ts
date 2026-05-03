import NetInfo from '@react-native-community/netinfo';

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function watchNetwork(callback: (online: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    callback(state.isConnected === true && state.isInternetReachable !== false);
  });
}
