import { Accessor, createSignal, onCleanup } from "solid-js";
import {
  Connection,
  wbinit,
  connect as wbconnect,
  KeyValuePairs,
  KeyValuePair,
  Key,
  Value,
  TransactionID,
  Handshake,
} from "worterbuch-js";
import { sortAlphaNumKV } from "./sort";

const [wb, setWb] = createSignal<Connection | undefined>();
const [sep, setSeparator] = createSignal("/");
const [wc, setWildcard] = createSignal("?");
const [mwc, setMultiWildcard] = createSignal("#");

export const worterbuch = wb;
export const separator = sep;
export const wildcard = wc;
export const multiWildcard = mwc;

export function topic(...segments: string[]) {
  return segments.join(separator());
}

const wasm = wbinit();

export function connect(address: string) {
  wasm.then(() => {
    const wb = wbconnect(address, true);
    wb.onclose = () => setWb(undefined);
    wb.onhandshake = (handshake: Handshake) => {
      setSeparator(handshake.separator);
      setWildcard(handshake.wildcard);
      setMultiWildcard(handshake.wildcard);
      setWb(wb);
    };
  });
}

export function get<T>(key: string): Accessor<T | undefined> {
  const [value, setValue] = createSignal<T | undefined>();
  wb()?.get(key, setValue);
  return value;
}

export async function getValue<T>(key: string) {
  return await wb()?.getValue(key);
}

export function pGet(pattern: string, sort?: boolean): Accessor<KeyValuePairs> {
  const [kvps, setKvps] = createSignal<KeyValuePairs>([]);

  const updateValues = (keyValuePairs: KeyValuePairs) => {
    if (sort) {
      keyValuePairs.sort(sortAlphaNumKV);
    }
    setKvps(keyValuePairs);
  };

  wb()?.pGet(pattern, updateValues);
  return kvps;
}

export type MappedAccessor = {
  accessor: Accessor<Map<string, Accessor<Value>>>;
  getMapped: <T>(key: string) => () => T | undefined;
};

export function pSubscribeMapped<T>(pattern: string): MappedAccessor {
  const [map, setMap] = createSignal(new Map());
  const setterMap = new Map();

  const updateMap = (kvps: KeyValuePairs) => {
    let mapNeedsUpdate = false;
    const getterMap = map();

    for (const { key, value } of kvps) {
      const setter = setterMap.get(key);
      if (setter) {
        // the keys in the map do not change, components using the map don't need to update their layout,
        // only components showing individual values will update
        setter(value);
      } else {
        // the keys in the map do change, we must make sure components using the map update their layout if needed
        mapNeedsUpdate = true;
        const [newGetter, newSetter] = createSignal(value);
        setterMap.set(key, newSetter);
        getterMap.set(key, newGetter);
      }
    }

    if (mapNeedsUpdate) {
      // this will triggger components who need to iterate over the entries of the map to be re-rendered
      setMap(new Map(getterMap));
    }
  };

  const tid = worterbuch()?.pSubscribe(pattern, updateMap, true);
  if (tid) {
    onCleanup(() => {
      worterbuch()?.unsubscribe(tid);
    });
  }

  return {
    accessor: map,
    getMapped: (key: string) => {
      const getter = map().get(key);
      return () => {
        if (getter) return getter();
      };
    },
  };
}

export function subscribe<T>(key: string): Accessor<T | undefined> {
  const [value, setValue] = createSignal<T | undefined>();

  const tid = wb()?.subscribe(key, setValue, true);
  if (tid) {
    onCleanup(() => {
      wb()?.unsubscribe(tid);
    });
  }
  return value;
}

export function pSubscribe(
  pattern: string,
  sort?: boolean
): Accessor<KeyValuePairs> {
  const [kvps, setKvps] = createSignal<KeyValuePairs>([]);

  const updateValues = (keyValuePairs: KeyValuePairs) => {
    if (sort) {
      keyValuePairs.sort(sortAlphaNumKV);
    }
    setKvps(keyValuePairs);
  };

  const tid = wb()?.pSubscribe(pattern, updateValues, true);
  if (tid) {
    onCleanup(() => {
      wb()?.unsubscribe(tid);
    });
  }
  return kvps;
}

export function set(key: Key, value: Value): TransactionID | undefined {
  return wb()?.set(key, value);
}
