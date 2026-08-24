export const playAlbumTrackEvent = "mkt-play-album-track";

export type PlayAlbumTrackDetail = {
  index: number;
};

export function requestAlbumTrackPlayback(index: number) {
  window.dispatchEvent(new CustomEvent<PlayAlbumTrackDetail>(playAlbumTrackEvent, {
    detail: { index },
  }));
}
