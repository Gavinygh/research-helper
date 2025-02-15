<template>
  <q-menu
    touch-position
    context-menu
    square
    transition-duration="0"
  >
    <q-list dense>
      <q-item
        clickable
        v-close-popup
        @click="copyProjectId"
      >
        <q-item-section>{{ $t("copy-project-id") }}</q-item-section>
      </q-item>

      <q-separator />

      <q-item
        v-if="row.dataType === 'project'"
        clickable
        v-close-popup
        @click="onAddNote()"
      >
        <q-item-section> {{ $t("add-note") }} </q-item-section>
      </q-item>
      <q-item
        clickable
        @mouseover="($refs.submenu as QMenu).show()"
      >
        <q-item-section>
          {{ !!row.path ? $t("replace-file") : $t("attach-file") }}
        </q-item-section>
        <q-item-section side>
          <q-icon name="arrow_right" />
        </q-item-section>
        <q-menu
          square
          anchor="top end"
          self="top start"
          ref="submenu"
        >
          <q-list dense>
            <q-item
              clickable
              v-close-popup
            >
              <q-item-section @click="onAttachFile(true)">
                {{
                  !!row.path
                    ? $t("replace-stored-copy-of-file")
                    : $t("attach-stored-copy-of-file")
                }}
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
            >
              <q-item-section @click="onAttachFile(false)">
                {{
                  !!row.path
                    ? $t("replace-path-to-file")
                    : $t("attach-path-to-file")
                }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>

      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="openProject"
      >
        <q-item-section>{{ $t("open-project") }}</q-item-section>
      </q-item>

      <q-item
        clickable
        v-close-popup
        @click="searchMeta"
      >
        <q-item-section>{{ $t("search-meta-info") }}</q-item-section>
      </q-item>

      <q-item
        v-if="stateStore.selectedFolderId != 'library'"
        clickable
        v-close-popup
        @click="deleteProject(false)"
      >
        <q-item-section>{{ $t("delete-from-folder") }}</q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="deleteProject(true)"
      >
        <q-item-section>{{ $t("delete-from-database") }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script lang="ts">
// types
import { defineComponent, inject, PropType } from "vue";
import { Project } from "src/backend/database";
import { QMenu, QTableProps } from "quasar";
import {
  KEY_metaDialog,
  KEY_deleteDialog,
  KEY_addNote,
  KEY_attachFile,
} from "./injectKeys";
// db
import { copyToClipboard } from "quasar";
import { useStateStore } from "src/stores/appState";

export default defineComponent({
  props: {
    row: { type: Object as PropType<Project>, required: true },
    rowIndex: { type: Number, required: true },
    props: { type: Object as PropType<QTableProps> },
  },
  emits: ["expandRow"],

  data() {
    return {
      replaceStoredCopy: false,
    };
  },

  setup() {
    const stateStore = useStateStore();
    // dialogs
    const showSearchMetaDialog = inject(KEY_metaDialog) as () => void;
    const showDeleteDialog = inject(KEY_deleteDialog) as (
      project: Project,
      deleteFromDB: boolean
    ) => void;
    // note
    const addNote = inject(KEY_addNote) as (
      projectId: string,
      index?: number
    ) => void;
    const attachFile = inject(KEY_attachFile) as (
      replace: boolean,
      projectId: string,
      index?: number
    ) => void;
    return {
      stateStore,
      showSearchMetaDialog,
      showDeleteDialog,
      addNote,
      attachFile,
    };
  },

  methods: {
    onAddNote() {
      this.addNote(this.row._id, this.rowIndex);
      this.expandRow(true);
    },

    expandRow(isExpand: boolean) {
      this.$emit("expandRow", isExpand);
    },

    openProject() {
      this.stateStore.openItem(this.row._id);
    },

    copyProjectId() {
      copyToClipboard(this.row._id);
    },

    deleteProject(deleteFromDB: boolean) {
      this.showDeleteDialog(this.row, deleteFromDB);
    },

    /**
     * Update a project by meta
     */
    searchMeta() {
      this.showSearchMetaDialog();
    },

    /**
     * Attach PDF to a project
     * @param replaceStoredCopy - replace the copy in storage?
     */
    onAttachFile(replaceStoredCopy: boolean) {
      this.attachFile(replaceStoredCopy, this.row._id, this.rowIndex);
      this.expandRow(true);
    },
  },
});
</script>
