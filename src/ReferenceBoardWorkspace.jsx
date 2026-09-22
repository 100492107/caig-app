import React, { useEffect, useMemo, useState } from "react";
import EnterpriseShell from "./EnterpriseShell.jsx";
import { supabase } from "./supabase";

const SOURCES = [
  ["pinterest", "Pinterest", "Pins, pose boards, outfit references"],
  ["vinted", "Vinted", "Real clothing listings and silhouettes"],
  ["depop", "Depop", "Vintage, street and editorial looks"],
];
const CATS = ["all", "wardrobe", "pose", "scene", "accessory", "mixed"];
const PURPOSES = ["wardrobe", "pose", "scene", "shoot", "mixed"];
const CREATOR_OPTIONS = [["cara", "Cara"], ["lila", "Lila"], ["duo", "Cara + Lila"], ["neutral", "Neutral"]];

function sourceGuess(url) {
  const value = String(url || "").toLowerCase();
  if (/pinterest\.|pin\.it/.test(value)) return "pinterest";
  if (/vinted\./.test(value)) return "vinted";
  if (/depop\.com/.test(value)) return "depop";
  return "other";
}
function badge(source) {
  return source === "pinterest" ? "PIN" : source === "vinted" ? "VINTED" : source === "depop" ? "DEPOP" : "WEB";
}
function parseResult(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return { text: String(value) }; }
}

async function waitJob(id) {
  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("local_ai_jobs")
      .select("id,status,result,error_message")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The local AI job disappeared.");
    if (data.status === "completed") return parseResult(data.result);
    if (data.status === "error") throw new Error(data.error_message || "Local AI job failed.");
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("Local AI job timed out. Check the local Qwen worker on your Mac.");
}

export default function ReferenceBoardWorkspace() {
  const [boards, setBoards] = useState([]);
  const [boardId, setBoardId] = useState("");
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creator, setCreator] = useState("cara");
  const [purpose, setPurpose] = useState("mixed");
  const [category, setCategory] = useState("mixed");
  const [boardName, setBoardName] = useState("Cara · Visual Reference Board");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function currentUser() {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data?.user) throw new Error("Sign in required.");
    return data.user;
  }

  async function loadItems(id = boardId, nextFilter = filter) {
    if (!id) {
      setItems([]);
      return;
    }
    const user = await currentUser();
    let query = supabase
      .from("cornerstone_visual_references")
      .select("*")
      .eq("owner_id", user.id)
      .eq("board_id", id)
      .order("created_at", { ascending: false });
    if (nextFilter !== "all") query = query.eq("category", nextFilter);
    const { data, error: loadError } = await query;
    if (loadError) throw loadError;
    setItems(data || []);
  }

  async function loadRecipes(id = boardId) {
    if (!id) {
      setRecipes([]);
      return;
    }
    const user = await currentUser();
    const { data, error: loadError } = await supabase
      .from("cornerstone_visual_reference_recipes")
      .select("*")
      .eq("owner_id", user.id)
      .eq("board_id", id)
      .order("created_at", { ascending: false })
      .limit(12);
    if (loadError) throw loadError;
    setRecipes(data || []);
  }

  async function loadBoards(preferred = "") {
    const user = await currentUser();
    const { data, error: loadError } = await supabase
      .from("cornerstone_visual_reference_boards")
      .select("*")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });
    if (loadError) throw loadError;
    const next = data || [];
    setBoards(next);
    const chosen = preferred && next.some((board) => board.id === preferred)
      ? preferred
      : next[0]?.id || "";
    setBoardId(chosen);
    await Promise.all([loadItems(chosen, filter), loadRecipes(chosen)]);
  }

  useEffect(() => {
    loadBoards("").catch((loadError) => setError(loadError?.message || String(loadError)));
  }, []);

  useEffect(() => {
    if (!boardId) return;
    Promise.all([loadItems(boardId, filter), loadRecipes(boardId)]).catch((loadError) => {
      setError(loadError?.message || String(loadError));
    });
  }, [boardId, filter]);

  async function createBoard() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      const { data, error: createError } = await supabase
        .from("cornerstone_visual_reference_boards")
        .insert({
          owner_id: user.id,
          name: boardName.trim() || "Visual Reference Board",
          creator_id: creator,
          purpose,
          description: "Reusable wardrobe, pose and scene references for owned creator production.",
        })
        .select("*")
        .single();
      if (createError) throw createError;
      setBoards((current) => [data, ...current]);
      setBoardId(data.id);
      setItems([]);
      setRecipes([]);
      setMessage("Board created.");
    } catch (createError) {
      setError(createError?.message || String(createError));
    } finally {
      setBusy(false);
    }
  }

  async function ingest() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!boardId) throw new Error("Create or select a board first.");
      if (!url.trim()) throw new Error("Paste a Pinterest, Vinted, Depop or public reference URL.");
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const response = await fetch("/api/reference-ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: JSON.stringify({
          url: url.trim(),
          image_url: imageUrl.trim() || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not read source.");
      const user = await currentUser();
      const selectedCategory = category === "mixed" ? (result.recipe?.category || "mixed") : category;
      const { data, error: insertError } = await supabase
        .from("cornerstone_visual_references")
        .insert({
          owner_id: user.id,
          board_id: boardId,
          source_platform: result.source_platform || sourceGuess(url),
          source_url: result.source_url,
          canonical_url: result.canonical_url,
          image_url: result.image_url,
          storage_path: result.structured_data?.storage_path || null,
          title: result.title,
          description: result.description,
          media_type: "image",
          category: selectedCategory,
          tags: [result.source_platform || sourceGuess(url), selectedCategory],
          structured_data: result.structured_data || {},
          recipe: result.recipe || {},
          analysis: {},
          analysis_status: result.image_url ? "pending" : "no_image",
        })
        .select("*")
        .single();
      if (insertError) throw insertError;
      setItems((current) => [data, ...current]);
      setUrl("");
      setImageUrl("");
      setMessage(result.image_url
        ? "Reference added. It is ready for local Qwen Vision analysis."
        : "Reference saved without a preview image. Add an image URL when available.");
    } catch (ingestError) {
      setError(ingestError?.message || String(ingestError));
    } finally {
      setBusy(false);
    }
  }

  async function analysePending() {
    setAnalysing(true);
    setError("");
    setMessage("");
    try {
      const user = await currentUser();
      const { data: pending, error: pendingError } = await supabase
        .from("cornerstone_visual_references")
        .select("id,image_url,title")
        .eq("owner_id", user.id)
        .eq("board_id", boardId)
        .eq("analysis_status", "pending")
        .limit(24);
      if (pendingError) throw pendingError;
      const rows = pending || [];
      if (!rows.length) {
        setMessage("Nothing is waiting for analysis.");
        return;
      }
      for (const item of rows) {
        await supabase
          .from("cornerstone_visual_references")
          .update({ analysis_status: "processing", analysis_error: null })
          .eq("id", item.id)
          .eq("owner_id", user.id);
        const { error: queueError } = await supabase.from("local_ai_jobs").insert({
          owner_id: user.id,
          title: "Visual reference · " + (item.title || item.id),
          job_type: "visual_reference_analysis",
          model: "mlx-community/Qwen2.5-VL-3B-Instruct-4bit",
          persona_id: creator,
          system_prompt: "Analyse one public visual reference as original creative research. Do not identify the person. Extract reusable visual structure only. Return strict JSON.",
          user_prompt: "Analyse this image for Cornerstone wardrobe, pose, environment and composition. Image: " + item.image_url + " Structure only; never copy the person's face, branding or distinctive execution.",
          options: {
            reference_id: item.id,
            image_url: item.image_url,
            creator_id: creator,
          },
          status: "queued",
          production_status: "reference_analysis_queued",
        });
        if (queueError) {
          await supabase
            .from("cornerstone_visual_references")
            .update({ analysis_status: "error", analysis_error: queueError.message })
            .eq("id", item.id)
            .eq("owner_id", user.id);
        }
      }
      setMessage(rows.length + " reference(s) queued for local Qwen Vision analysis.");
      await loadItems(boardId, filter);
    } catch (analysisError) {
      setError(analysisError?.message || String(analysisError));
    } finally {
      setAnalysing(false);
    }
  }

  async function generateRecipe() {
    setGeneratingRecipe(true);
    setError("");
    setMessage("");
    try {
      if (!boardId) throw new Error("Create or select a board first.");
      const user = await currentUser();
      const { data: selectedBoard, error: boardError } = await supabase
        .from("cornerstone_visual_reference_boards")
        .select("*")
        .eq("id", boardId)
        .eq("owner_id", user.id)
        .single();
      if (boardError) throw boardError;

      const analysed = items.filter((item) => item.analysis_status === "complete");
      if (!analysed.length) {
        throw new Error("Analyse at least one reference before generating a wardrobe / pose recipe.");
      }

      const sourcePack = analysed.slice(0, 12).map((item) => ({
        id: item.id,
        source: item.source_platform,
        title: item.title,
        category: item.category,
        analysis: item.analysis || {},
        recipe: item.recipe || {},
      }));

      const userPrompt = [
        "CORNERSTONE VISUAL REFERENCE MIXER",
        "Create 6 original looks from the analysed reference structures below.",
        "Do not copy any person's identity, exact branded outfit, distinctive styling, or composition.",
        "Keep the selected creator's canonical DNA intact.",
        "Blend wardrobe, pose, scene and composition structure from the references into new combinations.",
        "Return strict JSON only:",
        '{"name":"short board recipe name","rationale":"brief explanation","looks":[{"name":"look name","wardrobe":{"silhouette":"","garments":[],"materials":[],"colours":[],"fit":"","details":""},"pose":{"family":"","geometry":"","crop":"","gaze":"","hands":""},"environment":{"setting":"","lived_in_details":[],"lighting":""},"composition":{"camera_height":"","perspective":"","framing":"","subject_position":""},"adaptation":"why this is original and how it fits the creator"}]}',
        "BOARD CREATOR: " + (selectedBoard.creator_id || creator),
        "BOARD PURPOSE: " + (selectedBoard.purpose || purpose),
        "REFERENCE STRUCTURES:",
        JSON.stringify(sourcePack).slice(0, 30000),
      ].join("\n");

      const { data: job, error: queueError } = await supabase
        .from("local_ai_jobs")
        .insert({
          owner_id: user.id,
          title: "Visual recipe · " + selectedBoard.name,
          job_type: "visual_reference_recipe",
          model: "mlx-community/Qwen3.5-9B-4bit",
          persona_id: selectedBoard.creator_id === "duo" ? "cara_lila" : (selectedBoard.creator_id || creator),
          system_prompt: "You are Cornerstone's Visual Reference Mixer. Produce original wardrobe, pose, scene and composition recipes from public visual research. Identity is never copied. Use structure only. Return strict JSON and no prose outside it.",
          user_prompt: userPrompt,
          options: {
            creator_id: selectedBoard.creator_id || creator,
            board_id: boardId,
            purpose: selectedBoard.purpose || purpose,
            max_tokens: 1100,
            temperature: 0.45,
          },
          status: "queued",
          production_status: "visual_reference_recipe_queued",
        })
        .select("id")
        .single();
      if (queueError) throw queueError;

      setMessage("Generating six original wardrobe / pose combinations with local Qwen…");
      const result = await waitJob(job.id);
      const recipe = result?.data && !result?.looks ? result.data : result;
      if (!recipe || !Array.isArray(recipe.looks) || !recipe.looks.length) {
        throw new Error("Qwen returned no usable visual recipe.");
      }

      const sourceIds = analysed.slice(0, 12).map((item) => item.id);
      const { data: savedRecipe, error: saveError } = await supabase
        .from("cornerstone_visual_reference_recipes")
        .insert({
          owner_id: user.id,
          board_id: boardId,
          creator_id: selectedBoard.creator_id || creator,
          purpose: selectedBoard.purpose || purpose,
          name: recipe.name || "Generated visual recipe",
          source_reference_ids: sourceIds,
          recipe,
        })
        .select("*")
        .single();
      if (saveError) throw saveError;

      setRecipes((current) => [savedRecipe, ...current]);
      setMessage("Recipe created. It is ready to apply to Creator Studio.");
    } catch (recipeError) {
      setError(recipeError?.message || String(recipeError));
    } finally {
      setGeneratingRecipe(false);
    }
  }

  function applyBoard(recipe = null) {
    const selected = items.filter((item) => item.image_url);
    if (!selected.length) {
      setError("Add at least one reference image before applying the board.");
      return;
    }
    const board = boards.find((item) => item.id === boardId);
    const activeRecipe = recipe || recipes[0] || null;
    const pack = {
      board_id: boardId,
      name: board?.name || "Visual Reference Board",
      creator: board?.creator_id || creator,
      purpose: board?.purpose || purpose,
      images: selected.slice(0, 8).map((item) => item.image_url),
      references: selected.slice(0, 8).map((item) => ({
        id: item.id,
        source: item.source_platform,
        title: item.title,
        category: item.category,
        recipe: item.recipe || {},
        analysis: item.analysis || {},
        tags: item.tags || [],
      })),
      recipe_id: activeRecipe?.id || null,
      applied_at: new Date().toISOString(),
    };
    sessionStorage.setItem("cornerstone_visual_reference_pack", JSON.stringify(pack));
    if (activeRecipe) {
      sessionStorage.setItem("cornerstone_visual_reference_recipe", JSON.stringify(activeRecipe));
    } else {
      sessionStorage.removeItem("cornerstone_visual_reference_recipe");
    }
    window.location.assign("/content/creators");
  }

  function applyRecipe(recipe) {
    applyBoard(recipe);
  }

  async function remove(item) {
    if (!window.confirm("Remove this reference from the board?")) return;
    const user = await currentUser();
    const { error: removeError } = await supabase
      .from("cornerstone_visual_references")
      .delete()
      .eq("id", item.id)
      .eq("owner_id", user.id);
    if (removeError) setError(removeError.message);
    else setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  const visibleItems = useMemo(
    () => items.filter((item) => filter === "all" || item.category === filter),
    [items, filter]
  );

  const latestRecipe = recipes[0] || null;

  return (
    <EnterpriseShell active="references" eyebrow="References">
      <main className="bi">
        <header className="bi-head">
          <div>
            <div className="bi-k">Creator loop / Visual references</div>
            <h1>Build the visual language before you generate.</h1>
            <p>
              Collect public Pinterest, Vinted and Depop references, preserve the source page,
              copy the image into Cornerstone storage when available, analyse it locally,
              mix the structure into original recipes, then apply that recipe to Cara or Lila.
            </p>
          </div>
          <div className="bi-head-meta">
            <b>{visibleItems.length} references</b>
            <span>Board: {boards.find((item) => item.id === boardId)?.name || "none"}</span>
            <small>Public metadata + local Qwen Vision · identity stays canonical</small>
          </div>
        </header>

        {error && <div className="bi-error">{error}</div>}
        {message && <div className="bi-success">{message}</div>}

        <section className="bi-grid2">
          <article className="bi-panel">
            <div className="bi-panel-head"><b>Reference board</b><span>Persistent visual inputs</span></div>
            <div style={{ padding: 16, display: "grid", gap: 11 }}>
              <label className="bi-k">
                Select board
                <select value={boardId} onChange={(event) => setBoardId(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }}>
                  <option value="">Create a new board…</option>
                  {boards.map((board) => <option value={board.id} key={board.id}>{board.name}</option>)}
                </select>
              </label>
              {!boardId && <>
                <label className="bi-k">Name<input value={boardName} onChange={(event) => setBoardName(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }} /></label>
                <label className="bi-k">Creator<select value={creator} onChange={(event) => setCreator(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }}>{CREATOR_OPTIONS.map((entry) => <option value={entry[0]} key={entry[0]}>{entry[1]}</option>)}</select></label>
                <label className="bi-k">Purpose<select value={purpose} onChange={(event) => setPurpose(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }}>{PURPOSES.map((entry) => <option value={entry} key={entry}>{entry}</option>)}</select></label>
                <button className="bi-primary" disabled={busy} onClick={createBoard}>{busy ? "Creating…" : "Create board"}</button>
              </>}
              {boardId && <div className="bi-rule">The board keeps identity separate from visual structure. Reuse it across many experiments.</div>}
            </div>
          </article>

          <article className="bi-panel">
            <div className="bi-panel-head"><b>Collect references</b><span>Public source → structure</span></div>
            <div style={{ padding: 16, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {SOURCES.map((entry) => <button key={entry[0]} className="bi-tab" onClick={() => window.open(entry[0] === "pinterest" ? "https://www.pinterest.com/search/pins/?q=outfit%20pose%20reference" : entry[0] === "vinted" ? "https://www.vinted.co.uk/catalog?search_text=women%20outfit" : "https://www.depop.com/search/?q=women%20outfit", "_blank", "noopener,noreferrer")}>{entry[1]} ↗</button>)}
              </div>
              <label className="bi-k">Public URL<input value={url} onChange={(event) => setUrl(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }} placeholder="Pinterest pin, Vinted listing or Depop item URL" /></label>
              <label className="bi-k">Optional image URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }} placeholder="Use when the source hides its image" /></label>
              <label className="bi-k">Category<select value={category} onChange={(event) => setCategory(event.target.value)} style={{ display: "block", width: "100%", marginTop: 7 }}>{CATS.slice(1).map((entry) => <option value={entry} key={entry}>{entry}</option>)}</select></label>
              <button className="bi-primary" disabled={busy || !boardId} onClick={ingest}>{busy ? "Reading…" : "Add reference"}</button>
              <div className="bi-rule">The marketplace is a source of structure, not a template. No private marketplace API is required.</div>
            </div>
          </article>
        </section>

        <section className="bi-panel">
          <div className="bi-panel-head"><b>Automation</b><span>Local Qwen handles the expensive thinking</span></div>
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div className="bi-rule">
              <b>1. Analyse</b> turns each reference into structured wardrobe, pose, environment and composition data.
              <br /><b>2. Mix</b> creates six original look recipes from the board.
              <br /><b>3. Apply</b> sends the board images and recipe context into Creator Studio while canonical Cara/Lila identity remains the hard constraint.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="bi-tab" disabled={analysing || !boardId} onClick={analysePending}>{analysing ? "Queueing analysis…" : "Auto analyse pending"}</button>
              <button className="bi-primary" disabled={generatingRecipe || !boardId} onClick={generateRecipe}>{generatingRecipe ? "Generating six looks…" : "Generate 6 wardrobe + pose looks"}</button>
              <button className="bi-tab" disabled={!boardId || !items.some((item) => item.image_url)} onClick={() => applyBoard()}>{latestRecipe ? "Apply latest board + recipe" : "Apply board to Creator"}</button>
            </div>
          </div>
        </section>

        {latestRecipe && (
          <section className="bi-panel">
            <div className="bi-panel-head"><b>Latest generated recipe</b><span>{latestRecipe.name}</span></div>
            <div style={{ padding: 16 }}>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.5 }}>{latestRecipe.recipe?.rationale || "Generated from analysed public visual structures."}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginTop: 14 }}>
                {(latestRecipe.recipe?.looks || []).map((look, index) => (
                  <article key={look.name || index} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)" }}>
                    <div className="bi-k">LOOK {index + 1}</div>
                    <strong style={{ display: "block", marginTop: 5 }}>{look.name || "Original look"}</strong>
                    <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, color: "var(--text-muted)" }}>
                      <b>Wardrobe:</b> {look.wardrobe?.silhouette || "structured"} · {(look.wardrobe?.garments || []).join(", ")}
                      <br /><b>Pose:</b> {look.pose?.family || "custom"} · {look.pose?.geometry || ""}
                      <br /><b>Scene:</b> {look.environment?.setting || "lived-in setting"}
                      <br /><b>Camera:</b> {look.composition?.camera_height || "eye level"} · {look.composition?.framing || "social crop"}
                    </div>
                    {look.adaptation && <p style={{ margin: "9px 0 0", fontSize: 10, color: "var(--text-muted)" }}>{look.adaptation}</p>}
                  </article>
                ))}
              </div>
              <button className="bi-primary" style={{ marginTop: 14 }} onClick={() => applyRecipe(latestRecipe)}>Apply this recipe to Creator Studio</button>
            </div>
          </section>
        )}

        <section className="bi-panel">
          <div className="bi-panel-head"><b>Reference library</b><span>{visibleItems.length} visible · {items.length} saved</span></div>
          <div style={{ padding: "12px 16px", display: "flex", gap: 7, flexWrap: "wrap" }}>
            {CATS.map((entry) => <button key={entry} className={filter === entry ? "bi-tab active" : "bi-tab"} onClick={() => setFilter(entry)}>{entry}</button>)}
          </div>
          {visibleItems.length === 0 ? <div className="bi-empty">No references in this view.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, padding: 16 }}>
              {visibleItems.map((item) => (
                <article key={item.id} style={{ border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "var(--surface)" }}>
                  <div style={{ aspectRatio: "4/5", background: "var(--panel-2)", overflow: "hidden" }}>
                    {item.image_url
                      ? <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 20, textAlign: "center" }}>No preview image</div>}
                  </div>
                  <div style={{ padding: 12 }}>
                    <div className="bi-k">{badge(item.source_platform)} · {item.category}</div>
                    <strong style={{ display: "block", marginTop: 6 }}>{item.title || "Untitled reference"}</strong>
                    <small style={{ display: "block", marginTop: 6, color: "var(--text-muted)" }}>
                      {item.analysis_status === "complete" ? "Analysed locally" : item.analysis_status === "processing" ? "Analysing…" : item.analysis_status === "error" ? "Analysis error" : item.analysis_status === "no_image" ? "Metadata only" : "Waiting for analysis"}
                    </small>
                    {(item.analysis?.pose?.family || item.analysis?.wardrobe?.silhouette) && (
                      <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--text-muted)" }}>
                        {item.analysis?.pose?.family || item.recipe?.category || "structure"} · {item.analysis?.wardrobe?.silhouette || item.analysis?.wardrobe?.fit || ""}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                      <a href={item.source_url} target="_blank" rel="noreferrer" className="bi-tab">Open source ↗</a>
                      <button className="bi-tab" onClick={() => remove(item)}>Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </EnterpriseShell>
  );
}
