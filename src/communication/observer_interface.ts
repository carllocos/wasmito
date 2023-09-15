export interface ObserverChannel {
    update(data: string): void;
}

export interface ObsersableChannel {
    addObserver(o: ObserverChannel): void;
    removeObserver(o: ObserverChannel): void;
}