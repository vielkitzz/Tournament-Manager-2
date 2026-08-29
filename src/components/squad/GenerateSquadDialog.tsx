import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Save, X } from "lucide-react";
import { toast } from "sonner";
import CountryFlag from "@/components/CountryFlag";
import { COUNTRIES_DATA } from "@/data/countries";
import { Player } from "@/types/tournament";
import {
  DEFAULT_CONFIG,
  MAX_SQUAD_SIZE,
  POSITION_CODES,
  PositionCode,
  SquadGeneratorConfig,
  generateSquad,
  normalizeComposition,
  skillAnchorForRate,
  validateConfig,
} from "@/lib/squadGenerator";
import { SKILL_MAX, SKILL_MIN } from "@/lib/playerSkill";
import { parseSquadText, playersFromSpecs } from "@/lib/squadTextParser";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamRate?: number;
  seasonYear?: number;
  existingCount: number;
  usedShirtNumbers: number[];
  onConfirm: (players: Player[]) => Promise<void>;
}

export default function GenerateSquadDialog({
  open,
  onOpenChange,
  teamId,
  teamRate,
  seasonYear,
  existingCount,
  usedShirtNumbers,
  onConfirm,
}: Props) {
  const [config, setConfig] = useState<SquadGeneratorConfig>({
    ...DEFAULT_CONFIG,
    teamId,
    teamRate: teamRate ?? 5,
    seasonYear,
    usedShirtNumbers,
  });
  const [preview, setPreview] = useState<Player[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [textSummary, setTextSummary] = useState<string[]>([]);
  const [textWarnings, setTextWarnings] = useState<string[]>([]);

  const effectiveConfig = useMemo<SquadGeneratorConfig>(
    () => ({ ...config, teamId, teamRate: teamRate ?? 5, seasonYear, usedShirtNumbers }),
    [config, teamId, teamRate, seasonYear, usedShirtNumbers],
  );

  const issues = useMemo(() => validateConfig(effectiveConfig, existingCount), [effectiveConfig, existingCount]);
  const errors = issues.filter((i) => i.level === "error");
  const normalized = useMemo(
    () => normalizeComposition(effectiveConfig.composition, effectiveConfig.size),
    [effectiveConfig],
  );

  const set = <K extends keyof SquadGeneratorConfig>(key: K, value: SquadGeneratorConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const handleGenerate = () => {
    if (errors.length > 0) return toast.error(errors[0].message);
    setPreview(generateSquad(effectiveConfig));
  };

  const handleSave = async () => {
    if (!preview || preview.length === 0) return;
    setSaving(true);
    try {
      await onConfirm(preview);
      setPreview(null);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar o elenco gerado");
    } finally {
      setSaving(false);
    }
  };

  const handleParseText = () => {
    const result = parseSquadText(text);
    if (result.mode === "empty") return toast.error("Escreva as regras ou a lista de jogadores");
    setTextSummary(result.summary);
    setTextWarnings(result.warnings);

    const merged: SquadGeneratorConfig = {
      ...effectiveConfig,
      ...result.configPatch,
      composition: result.configPatch.composition ?? effectiveConfig.composition,
      foreignPool: result.configPatch.foreignPool ?? effectiveConfig.foreignPool,
    };
    const capped = Math.max(1, Math.min(merged.size, MAX_SQUAD_SIZE - existingCount));
    const finalConfig: SquadGeneratorConfig = { ...merged, size: capped };

    setConfig((c) => ({ ...c, ...result.configPatch, size: capped }));

    if (result.players.length > 0) {
      setPreview(playersFromSpecs(result.players.slice(0, capped), finalConfig));
    } else {
      setPreview(generateSquad(finalConfig));
    }
  };

  const toggleForeign = (country: string) => {
    setConfig((c) => ({
      ...c,
      foreignPool: c.foreignPool.includes(country)
        ? c.foreignPool.filter((n) => n !== country)
        : [...c.foreignPool, country],
    }));
  };

  const avgSkill = preview && preview.length > 0
    ? Math.round((preview.reduce((s, p) => s + p.skill, 0) / preview.length) * 10) / 10
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 tracking-tight">
            <Sparkles className="w-4 h-4" /> Gerar elenco
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="controls">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="controls">Controles</TabsTrigger>
            <TabsTrigger value="text">Por texto</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 pt-4">
            <Label>Descreva o elenco</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder={`23 jogadores brasileiros
20% argentinos e uruguaios
idade entre 18 e 32
formação 4-3-3
habilidade 70-85

ou uma lista, um jogador por linha:
10, Rivaldo, MEI, 28, Brasil, 88
Ederson, GOL, 30, Brasil`}
            />
            <Button onClick={handleParseText} className="w-full gap-2">
              <Sparkles className="w-4 h-4" /> Interpretar e gerar prévia
            </Button>
            {textSummary.length > 0 && (
              <p className="text-xs text-muted-foreground">Entendido: {textSummary.join(" · ")}</p>
            )}
            {textWarnings.length > 0 && (
              <ul className="space-y-1 text-xs text-destructive">
                {textWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="controls" className="grid gap-6 md:grid-cols-2 pt-4">
          {/* Configuração geral */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quantidade de jogadores ({effectiveConfig.size})</Label>
              <Slider
                value={[effectiveConfig.size]}
                min={11}
                max={Math.max(11, MAX_SQUAD_SIZE - existingCount)}
                step={1}
                onValueChange={([v]) => set("size", v)}
              />
              <p className="text-xs text-muted-foreground">
                {existingCount} já no elenco · limite {MAX_SQUAD_SIZE}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nacionalidade base</Label>
              <Select value={effectiveConfig.baseNationality} onValueChange={(v) => set("baseNationality", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o país">
                    <span className="flex items-center gap-2">
                      <CountryFlag country={effectiveConfig.baseNationality} size={20} />
                      {effectiveConfig.baseNationality}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES_DATA.map((c) => (
                    <SelectItem key={c.code} value={c.name}>
                      <span className="flex items-center gap-2">
                        <CountryFlag country={c.name} size={20} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estrangeiros ({effectiveConfig.foreignPercent}%)</Label>
              <Slider
                value={[effectiveConfig.foreignPercent]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => set("foreignPercent", v)}
              />
              {effectiveConfig.foreignPercent > 0 && (
                <>
                  <Select value="" onValueChange={toggleForeign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar país estrangeiro" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES_DATA.filter((c) => c.name !== effectiveConfig.baseNationality).map((c) => (
                        <SelectItem key={c.code} value={c.name}>
                          <span className="flex items-center gap-2">
                            <CountryFlag country={c.name} size={20} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1.5">
                    {effectiveConfig.foreignPool.map((n) => (
                      <Badge key={n} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleForeign(n)}>
                        <CountryFlag country={n} size={16} />
                        {n}
                        <X className="w-3 h-3" />
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Idade mínima</Label>
                <Input
                  type="number"
                  value={effectiveConfig.minAge}
                  onChange={(e) => set("minAge", parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Idade máxima</Label>
                <Input
                  type="number"
                  value={effectiveConfig.maxAge}
                  onChange={(e) => set("maxAge", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Ajustar ao rate do clube</Label>
                <p className="text-xs text-muted-foreground">
                  Âncora {skillAnchorForRate(effectiveConfig.teamRate ?? 5)} (rate {effectiveConfig.teamRate ?? 5})
                </p>
              </div>
              <Switch checked={effectiveConfig.linkToRate} onCheckedChange={(v) => set("linkToRate", v)} />
            </div>

            {effectiveConfig.linkToRate ? (
              <div className="space-y-2">
                <Label>Amplitude de habilidade (±{effectiveConfig.skillSpread})</Label>
                <Slider
                  value={[effectiveConfig.skillSpread]}
                  min={0}
                  max={20}
                  step={1}
                  onValueChange={([v]) => set("skillSpread", v)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Habilidade mínima</Label>
                  <Input
                    type="number"
                    min={SKILL_MIN}
                    max={SKILL_MAX}
                    value={effectiveConfig.minSkill}
                    onChange={(e) => set("minSkill", parseInt(e.target.value) || SKILL_MIN)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Habilidade máxima</Label>
                  <Input
                    type="number"
                    min={SKILL_MIN}
                    max={SKILL_MAX}
                    value={effectiveConfig.maxSkill}
                    onChange={(e) => set("maxSkill", parseInt(e.target.value) || SKILL_MAX)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Composição */}
          <div className="space-y-3">
            <Label>Composição por posição</Label>
            <div className="grid grid-cols-2 gap-2">
              {POSITION_CODES.map((code: PositionCode) => (
                <div key={code} className="flex items-center gap-2">
                  <span className="w-10 text-xs text-muted-foreground">{code}</span>
                  <Input
                    type="number"
                    min={0}
                    max={MAX_SQUAD_SIZE}
                    className="h-8"
                    value={effectiveConfig.composition[code]}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        composition: { ...c.composition, [code]: Math.max(0, parseInt(e.target.value) || 0) },
                      }))
                    }
                  />
                  <span className="w-6 text-xs text-muted-foreground">→{normalized[code]}</span>
                </div>
              ))}
            </div>

            {issues.length > 0 && (
              <ul className="space-y-1 text-xs">
                {issues.map((i, idx) => (
                  <li key={idx} className={i.level === "error" ? "text-destructive" : "text-muted-foreground"}>
                    {i.message}
                  </li>
                ))}
              </ul>
            )}

            <Button onClick={handleGenerate} disabled={errors.length > 0} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              {preview ? "Gerar novamente" : "Gerar prévia"}
            </Button>
          </div>
          </TabsContent>
        </Tabs>

        {preview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {preview.length} jogadores · habilidade média {avgSkill}
              </p>
            </div>
            <div className="border rounded-lg max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Pos</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Hab.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.shirtNumber ?? "—"}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.position}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <CountryFlag country={p.nationality || ""} size={18} />
                          {p.nationality}
                        </span>
                      </TableCell>
                      <TableCell>{p.age}</TableCell>
                      <TableCell>{p.skill}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!preview || saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Criar elenco"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
