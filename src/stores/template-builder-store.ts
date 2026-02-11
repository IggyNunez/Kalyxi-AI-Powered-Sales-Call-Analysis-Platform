import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  Template,
  CriteriaGroup,
  Criteria,
  TemplateSettings,
  ScoringMethod,
  TemplateUseCase,
  CriteriaType,
  CriteriaConfig,
} from "@/types/database";

// ============================================================================
// TYPES
// ============================================================================

export interface DraftTemplate {
  id?: string;
  name: string;
  description: string;
  scoring_method: ScoringMethod;
  use_case: TemplateUseCase;
  pass_threshold: number;
  max_total_score: number;
  settings: TemplateSettings;
  status: "draft" | "active" | "archived";
  is_default: boolean;
}

export interface DraftGroup {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  weight: number;
  is_required: boolean;
  is_collapsed_by_default: boolean;
  isNew?: boolean; // For newly added groups not yet saved
}

export interface DraftCriteria {
  id: string;
  group_id: string | null;
  name: string;
  description: string;
  criteria_type: CriteriaType;
  config: CriteriaConfig;
  weight: number;
  max_score: number;
  sort_order: number;
  is_required: boolean;
  is_auto_fail: boolean;
  auto_fail_threshold: number | null;
  scoring_guide: string;
  keywords: string[];
  isNew?: boolean; // For newly added criteria not yet saved
  isExpanded?: boolean; // UI state for expansion
}

export interface ValidationError {
  field: string;
  message: string;
  groupId?: string;
  criteriaId?: string;
}

export interface HistoryState {
  template: DraftTemplate;
  groups: DraftGroup[];
  criteria: DraftCriteria[];
}

interface TemplateBuilderState {
  // Current state
  template: DraftTemplate;
  groups: DraftGroup[];
  criteria: DraftCriteria[];

  // UI state
  isDirty: boolean;
  isSaving: boolean;
  selectedGroupId: string | null;
  selectedCriteriaId: string | null;
  expandedGroupIds: Set<string>;
  validationErrors: ValidationError[];

  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;
  maxHistorySize: number;

  // Actions - Template
  initializeTemplate: (template: Template, groups: CriteriaGroup[], criteria: Criteria[]) => void;
  initializeNewTemplate: () => void;
  updateTemplate: (updates: Partial<DraftTemplate>) => void;
  updateSettings: (updates: Partial<TemplateSettings>) => void;

  // Actions - Groups
  addGroup: (name?: string) => string;
  updateGroup: (groupId: string, updates: Partial<DraftGroup>) => void;
  deleteGroup: (groupId: string) => void;
  reorderGroups: (startIndex: number, endIndex: number) => void;
  toggleGroupExpanded: (groupId: string) => void;

  // Actions - Criteria
  addCriteria: (groupId: string | null, type?: CriteriaType) => string;
  updateCriteria: (criteriaId: string, updates: Partial<DraftCriteria>) => void;
  deleteCriteria: (criteriaId: string) => void;
  moveCriteria: (criteriaId: string, targetGroupId: string | null, targetIndex: number) => void;
  reorderCriteria: (groupId: string | null, startIndex: number, endIndex: number) => void;
  duplicateCriteria: (criteriaId: string) => string;

  // Actions - Selection
  selectGroup: (groupId: string | null) => void;
  selectCriteria: (criteriaId: string | null) => void;

  // Actions - Validation
  validate: () => boolean;
  clearValidationErrors: () => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Actions - Save state
  setIsSaving: (saving: boolean) => void;
  markClean: () => void;

  // Getters
  getTotalWeight: () => number;
  getGroupCriteria: (groupId: string | null) => DraftCriteria[];
  getUngroupedCriteria: () => DraftCriteria[];
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultSettings: TemplateSettings = {
  allow_na: true,
  require_comments_below_threshold: false,
  comments_threshold: 50,
  auto_calculate: true,
  show_weights_to_agents: true,
  allow_partial_submission: false,
};

const defaultTemplate: DraftTemplate = {
  name: "New Template",
  description: "",
  scoring_method: "weighted",
  use_case: "sales_call",
  pass_threshold: 70,
  max_total_score: 100,
  settings: defaultSettings,
  status: "draft",
  is_default: false,
};

const getDefaultCriteriaConfig = (type: CriteriaType): CriteriaConfig => {
  switch (type) {
    case "scale":
      return { min: 1, max: 5, step: 1, labels: {} };
    case "pass_fail":
      return { pass_label: "Pass", fail_label: "Fail", pass_value: 100, fail_value: 0 };
    case "checklist":
      return { items: [], scoring: "sum" as const };
    case "dropdown":
      return { options: [] };
    case "multi_select":
      return { options: [], scoring: "sum" as const };
    case "rating_stars":
      return { max_stars: 5, allow_half: false };
    case "percentage":
      return { thresholds: [] };
    case "text":
      return { max_length: 1000, placeholder: "" };
    default:
      return {};
  }
};

// ============================================================================
// STORE
// ============================================================================

export const useTemplateBuilderStore = create<TemplateBuilderState>()(
  immer((set, get) => ({
    // Initial state
    template: { ...defaultTemplate },
    groups: [],
    criteria: [],
    isDirty: false,
    isSaving: false,
    selectedGroupId: null,
    selectedCriteriaId: null,
    expandedGroupIds: new Set(),
    validationErrors: [],
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,

    // Initialize from existing template
    initializeTemplate: (template, groups, criteria) => {
      set((state) => {
        state.template = {
          id: template.id,
          name: template.name,
          description: template.description || "",
          scoring_method: template.scoring_method,
          use_case: template.use_case,
          pass_threshold: template.pass_threshold,
          max_total_score: template.max_total_score,
          settings: template.settings,
          status: template.status,
          is_default: template.is_default,
        };
        state.groups = groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description || "",
          sort_order: g.sort_order,
          weight: g.weight,
          is_required: g.is_required,
          is_collapsed_by_default: g.is_collapsed_by_default,
        }));
        state.criteria = criteria.map((c) => ({
          id: c.id,
          group_id: c.group_id || null,
          name: c.name,
          description: c.description || "",
          criteria_type: c.criteria_type,
          config: c.config,
          weight: c.weight,
          max_score: c.max_score,
          sort_order: c.sort_order,
          is_required: c.is_required,
          is_auto_fail: c.is_auto_fail,
          auto_fail_threshold: c.auto_fail_threshold || null,
          scoring_guide: c.scoring_guide || "",
          keywords: c.keywords || [],
          isExpanded: false,
        }));
        state.isDirty = false;
        state.expandedGroupIds = new Set(groups.map((g) => g.id));
        state.history = [];
        state.historyIndex = -1;
        state.validationErrors = [];
      });
    },

    // Initialize new template
    initializeNewTemplate: () => {
      set((state) => {
        state.template = { ...defaultTemplate };
        state.groups = [];
        state.criteria = [];
        state.isDirty = false;
        state.expandedGroupIds = new Set();
        state.history = [];
        state.historyIndex = -1;
        state.validationErrors = [];
      });
    },

    // Update template
    updateTemplate: (updates) => {
      set((state) => {
        Object.assign(state.template, updates);
        state.isDirty = true;
      });
      get().pushHistory();
    },

    // Update settings
    updateSettings: (updates) => {
      set((state) => {
        Object.assign(state.template.settings, updates);
        state.isDirty = true;
      });
      get().pushHistory();
    },

    // Add group
    addGroup: (name) => {
      const id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        const maxOrder = Math.max(-1, ...state.groups.map((g) => g.sort_order));
        state.groups.push({
          id,
          name: name || `Group ${state.groups.length + 1}`,
          description: "",
          sort_order: maxOrder + 1,
          weight: 0,
          is_required: true,
          is_collapsed_by_default: false,
          isNew: true,
        });
        state.expandedGroupIds.add(id);
        state.isDirty = true;
      });
      get().pushHistory();
      return id;
    },

    // Update group
    updateGroup: (groupId, updates) => {
      set((state) => {
        const group = state.groups.find((g) => g.id === groupId);
        if (group) {
          Object.assign(group, updates);
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },

    // Delete group
    deleteGroup: (groupId) => {
      set((state) => {
        state.groups = state.groups.filter((g) => g.id !== groupId);
        // Move criteria to ungrouped
        state.criteria.forEach((c) => {
          if (c.group_id === groupId) {
            c.group_id = null;
          }
        });
        state.expandedGroupIds.delete(groupId);
        state.isDirty = true;
      });
      get().pushHistory();
    },

    // Reorder groups
    reorderGroups: (startIndex, endIndex) => {
      set((state) => {
        const sorted = [...state.groups].sort((a, b) => a.sort_order - b.sort_order);
        const [removed] = sorted.splice(startIndex, 1);
        sorted.splice(endIndex, 0, removed);
        sorted.forEach((g, i) => (g.sort_order = i));
        state.groups = sorted;
        state.isDirty = true;
      });
      get().pushHistory();
    },

    // Toggle group expanded
    toggleGroupExpanded: (groupId) => {
      set((state) => {
        if (state.expandedGroupIds.has(groupId)) {
          state.expandedGroupIds.delete(groupId);
        } else {
          state.expandedGroupIds.add(groupId);
        }
      });
    },

    // Add criteria
    addCriteria: (groupId, type = "scale") => {
      const id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        const groupCriteria = state.criteria.filter((c) => c.group_id === groupId);
        const maxOrder = Math.max(-1, ...groupCriteria.map((c) => c.sort_order));
        state.criteria.push({
          id,
          group_id: groupId,
          name: `New Criterion`,
          description: "",
          criteria_type: type,
          config: getDefaultCriteriaConfig(type),
          weight: 0,
          max_score: 100,
          sort_order: maxOrder + 1,
          is_required: true,
          is_auto_fail: false,
          auto_fail_threshold: null,
          scoring_guide: "",
          keywords: [],
          isNew: true,
          isExpanded: true,
        });
        state.isDirty = true;
      });
      get().pushHistory();
      return id;
    },

    // Update criteria
    updateCriteria: (criteriaId, updates) => {
      set((state) => {
        const criteria = state.criteria.find((c) => c.id === criteriaId);
        if (criteria) {
          // If changing criteria type, reset config
          if (updates.criteria_type && updates.criteria_type !== criteria.criteria_type) {
            updates.config = getDefaultCriteriaConfig(updates.criteria_type);
          }
          Object.assign(criteria, updates);
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },

    // Delete criteria
    deleteCriteria: (criteriaId) => {
      set((state) => {
        state.criteria = state.criteria.filter((c) => c.id !== criteriaId);
        state.isDirty = true;
      });
      get().pushHistory();
    },

    // Move criteria to different group
    moveCriteria: (criteriaId, targetGroupId, targetIndex) => {
      set((state) => {
        const criteria = state.criteria.find((c) => c.id === criteriaId);
        if (criteria) {
          criteria.group_id = targetGroupId;
          // Reorder within new group
          const groupCriteria = state.criteria
            .filter((c) => c.group_id === targetGroupId && c.id !== criteriaId)
            .sort((a, b) => a.sort_order - b.sort_order);
          groupCriteria.splice(targetIndex, 0, criteria);
          groupCriteria.forEach((c, i) => (c.sort_order = i));
          state.isDirty = true;
        }
      });
      get().pushHistory();
    },

    // Reorder criteria within group
    reorderCriteria: (groupId, startIndex, endIndex) => {
      set((state) => {
        const groupCriteria = state.criteria
          .filter((c) => c.group_id === groupId)
          .sort((a, b) => a.sort_order - b.sort_order);
        const [removed] = groupCriteria.splice(startIndex, 1);
        groupCriteria.splice(endIndex, 0, removed);
        groupCriteria.forEach((c, i) => (c.sort_order = i));
        state.isDirty = true;
      });
      get().pushHistory();
    },

    // Duplicate criteria
    duplicateCriteria: (criteriaId) => {
      const original = get().criteria.find((c) => c.id === criteriaId);
      if (!original) return "";

      const id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      set((state) => {
        const groupCriteria = state.criteria.filter((c) => c.group_id === original.group_id);
        const maxOrder = Math.max(-1, ...groupCriteria.map((c) => c.sort_order));
        state.criteria.push({
          ...original,
          id,
          name: `${original.name} (Copy)`,
          sort_order: maxOrder + 1,
          isNew: true,
          isExpanded: true,
        });
        state.isDirty = true;
      });
      get().pushHistory();
      return id;
    },

    // Selection
    selectGroup: (groupId) => {
      set((state) => {
        state.selectedGroupId = groupId;
        state.selectedCriteriaId = null;
      });
    },

    selectCriteria: (criteriaId) => {
      set((state) => {
        state.selectedCriteriaId = criteriaId;
        if (criteriaId) {
          const criteria = state.criteria.find((c) => c.id === criteriaId);
          state.selectedGroupId = criteria?.group_id || null;
        }
      });
    },

    // Validation
    validate: () => {
      const errors: ValidationError[] = [];
      const { template, groups, criteria } = get();

      // Template validation
      if (!template.name.trim()) {
        errors.push({ field: "name", message: "Template name is required" });
      }

      // Weight validation for weighted scoring
      if (template.scoring_method === "weighted") {
        const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
        if (Math.abs(totalWeight - 100) > 0.01) {
          errors.push({
            field: "weight",
            message: `Total weight must equal 100%. Current: ${totalWeight}%`,
          });
        }
      }

      // At least one criteria required
      if (criteria.length === 0) {
        errors.push({ field: "criteria", message: "At least one criterion is required" });
      }

      // Criteria validation
      criteria.forEach((c) => {
        if (!c.name.trim()) {
          errors.push({
            field: "name",
            message: "Criterion name is required",
            criteriaId: c.id,
          });
        }
        if (c.weight < 0 || c.weight > 100) {
          errors.push({
            field: "weight",
            message: "Weight must be between 0 and 100",
            criteriaId: c.id,
          });
        }
      });

      set((state) => {
        state.validationErrors = errors;
      });

      return errors.length === 0;
    },

    clearValidationErrors: () => {
      set((state) => {
        state.validationErrors = [];
      });
    },

    // History
    pushHistory: () => {
      const { template, groups, criteria, history, historyIndex, maxHistorySize } = get();
      set((state) => {
        // Remove any future history if we're not at the end
        const newHistory = state.history.slice(0, historyIndex + 1);
        // Add current state
        newHistory.push({
          template: JSON.parse(JSON.stringify(template)),
          groups: JSON.parse(JSON.stringify(groups)),
          criteria: JSON.parse(JSON.stringify(criteria)),
        });
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex > 0) {
        set((state) => {
          const prevState = history[historyIndex - 1];
          state.template = prevState.template;
          state.groups = prevState.groups;
          state.criteria = prevState.criteria;
          state.historyIndex = historyIndex - 1;
          state.isDirty = true;
        });
      }
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) {
        set((state) => {
          const nextState = history[historyIndex + 1];
          state.template = nextState.template;
          state.groups = nextState.groups;
          state.criteria = nextState.criteria;
          state.historyIndex = historyIndex + 1;
          state.isDirty = true;
        });
      }
    },

    // Save state
    setIsSaving: (saving) => {
      set((state) => {
        state.isSaving = saving;
      });
    },

    markClean: () => {
      set((state) => {
        state.isDirty = false;
      });
    },

    // Getters
    getTotalWeight: () => {
      return get().criteria.reduce((sum, c) => sum + c.weight, 0);
    },

    getGroupCriteria: (groupId) => {
      return get()
        .criteria.filter((c) => c.group_id === groupId)
        .sort((a, b) => a.sort_order - b.sort_order);
    },

    getUngroupedCriteria: () => {
      return get()
        .criteria.filter((c) => c.group_id === null)
        .sort((a, b) => a.sort_order - b.sort_order);
    },
  }))
);
