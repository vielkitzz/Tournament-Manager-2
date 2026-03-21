import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, MapPin, ChevronRight, ArrowLeft, Trophy, Calendar, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRegions,
  getCompetitionsByRegion,
  getErasByCompetition,
  getFormatLabel,
} from "@/data/templates";
import type { TournamentTemplate, TemplateRegion, CompetitionGroup } from "@/data/templates";

interface TemplateSelectorProps {
  onSelect: (template: TournamentTemplate) => void;
  onCancel: () => void;
}

const REGION_ICONS: Record<string, React.ReactNode> = {
  "Mundo": <Globe className="w-6 h-6" />,
  "Europa": <MapPin className="w-6 h-6" />,
  "América do Sul": <MapPin className="w-6 h-6" />,
};

const slideIn = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.15 } },
};

export default function TemplateSelector({ onSelect, onCancel }: TemplateSelectorProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRegion, setSelectedRegion] = useState<TemplateRegion | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);

  const regions = useMemo(() => getRegions(), []);
  const competitions = useMemo(
    () => (selectedRegion ? getCompetitionsByRegion(selectedRegion) : []),
    [selectedRegion]
  );
  const eras = useMemo(
    () => (selectedCompetition ? getErasByCompetition(selectedCompetition) : []),
    [selectedCompetition]
  );

  const handleRegion = (r: TemplateRegion) => {
    setSelectedRegion(r);
    setSelectedCompetition(null);
    setStep(2);
  };

  const handleCompetition = (name: string) => {
    setSelectedCompetition(name);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setSelectedCompetition(null);
    } else if (step === 2) {
      setStep(1);
      setSelectedRegion(null);
    }
  };

  const breadcrumb = [
    selectedRegion,
    selectedCompetition,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Header / Breadcrumb */}
      <div className="flex items-center gap-2 min-h-[32px]">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {breadcrumb.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>
                {item}
              </span>
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Region */}
        {step === 1 && (
          <motion.div key="regions" {...slideIn} className="grid gap-3">
            <p className="text-sm text-muted-foreground">Escolha a região da competição</p>
            {regions.map((region) => (
              <button
                key={region}
                onClick={() => handleRegion(region)}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  {REGION_ICONS[region]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{region}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCompetitionsByRegion(region).length} competições
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 2: Competition */}
        {step === 2 && (
          <motion.div key="competitions" {...slideIn} className="grid gap-3">
            <p className="text-sm text-muted-foreground">Escolha a competição</p>
            {competitions.map((comp) => (
              <button
                key={comp.originalName}
                onClick={() => handleCompetition(comp.originalName)}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{comp.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {comp.templates.length} {comp.templates.length === 1 ? "formato" : "formatos"} históricos
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </motion.div>
        )}

        {/* Step 3: Era */}
        {step === 3 && (
          <motion.div key="eras" {...slideIn} className="grid gap-3">
            <p className="text-sm text-muted-foreground">Escolha o formato / era</p>
            {eras.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{template.era}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Users className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">
                      {getFormatLabel(template)}
                    </p>
                  </div>
                </div>
                <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground">
        Cancelar
      </Button>
    </div>
  );
}
