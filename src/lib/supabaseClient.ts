import { createClient } from "@supabase/supabase-js";
import type { BoardState, BoardReference } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

const BOARDS_TABLE = "boards";
const BOARD_DATA_TABLE = "board_data";

export async function fetchBoards(): Promise<BoardReference[]> {
  const { data, error } = await supabase
    .from(BOARDS_TABLE)
    .select("id, name")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchBoards error:", error.message);
    return [];
  }
  return (data || []).map((b: any) => ({ id: b.id, name: b.name }));
}

export async function createBoardInDB(
  id: string,
  name: string,
  state: BoardState
): Promise<boolean> {
  const { error: e1 } = await supabase
    .from(BOARDS_TABLE)
    .insert({ id, name });

  if (e1) {
    console.error("createBoardInDB boards insert:", e1.message);
    return false;
  }

  const { error: e2 } = await supabase
    .from(BOARD_DATA_TABLE)
    .insert({ board_id: id, state: state as any });

  if (e2) {
    console.error("createBoardInDB data insert:", e2.message);
    return false;
  }
  return true;
}

export async function deleteBoardFromDB(id: string): Promise<boolean> {
  const { error } = await supabase.from(BOARDS_TABLE).delete().eq("id", id);
  if (error) {
    console.error("deleteBoardFromDB:", error.message);
    return false;
  }
  return true;
}

export async function renameBoardInDB(
  id: string,
  name: string
): Promise<boolean> {
  const { error } = await supabase
    .from(BOARDS_TABLE)
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("renameBoardInDB:", error.message);
    return false;
  }
  return true;
}

export async function fetchBoardState(id: string): Promise<BoardState | null> {
  const { data, error } = await supabase
    .from(BOARD_DATA_TABLE)
    .select("state")
    .eq("board_id", id)
    .maybeSingle();

  if (error) {
    console.error("fetchBoardState:", error.message);
    return null;
  }
  if (!data) return null;
  return data.state as BoardState;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveBoardStateDebounced(
  id: string,
  state: BoardState,
  delay = 800
): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveBoardState(id, state);
  }, delay);
}

export async function saveBoardState(
  id: string,
  state: BoardState
): Promise<boolean> {
  const { error } = await supabase
    .from(BOARD_DATA_TABLE)
    .upsert(
      {
        board_id: id,
        state: state as any,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "board_id" }
    );

  if (error) {
    console.error("saveBoardState:", error.message);
    return false;
  }
  return true;
}
