<template>
  <!-- 
    div spans the entire background.
    q-tree only spans enough height to display its elements
  -->
  <div style="height: 100%">
    <q-tree
      dense
      no-connectors
      :duration="0"
      :nodes="folders"
      node-key="_id"
      v-model:expanded="expandedKeys"
      v-model:selected="stateStore.selectedFolderId"
      @update:selected="saveState"
      :no-selection-unset="true"
      selected-color="primary"
      ref="tree"
    >
      <template v-slot:default-header="prop">
        <div
          class="row full-width"
          :class="{
            dragover:
              !!dragoverNode &&
              dragoverNode == prop.node &&
              draggingNode != prop.node,
          }"
          draggable="true"
          @dragstart="(e) => onDragStart(e, prop.node)"
          @dragover="(e) => onDragOver(e, prop.node)"
          @dragleave="(e) => onDragLeave(e, prop.node)"
          @drop="(e) => onDrop(e, prop.node)"
          @dragend="(e) => onDragEnd(e)"
        >
          <q-menu
            touch-position
            context-menu
          >
            <q-list dense>
              <q-item
                clickable
                v-close-popup
                @click="addFolder(prop.node)"
              >
                <q-item-section>{{ $t("add-folder") }}</q-item-section>
              </q-item>
              <q-item
                v-if="!specialFolderIds.includes(prop.node._id)"
                clickable
                v-close-popup
                @click="setRenameFolder(prop.node)"
              >
                <q-item-section>{{ $t("rename") }}</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="exportFolder(prop.node)"
              >
                <q-item-section>{{ $t("export-references") }}</q-item-section>
              </q-item>
              <q-item
                v-if="!specialFolderIds.includes(prop.node._id)"
                clickable
                v-close-popup
                @click="deleteFolder(prop.node)"
              >
                <q-item-section>{{ $t("delete") }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- the body of a tree node -->
          <!-- icon width: 1.5rem -->
          <q-icon
            size="1.5rem"
            :name="prop.node.icon"
          />
          <input
            v-if="renamingFolderId === prop.node._id"
            style="width: calc(100% - 1.5rem)"
            ref="renameInput"
            v-model="prop.node.label"
            @blur="renameFolder"
            @keydown.enter="renameFolder"
          />
          <div
            v-else
            style="font-size: 1rem"
            class="ellipsis"
          >
            {{ prop.node.label }}
          </div>
        </div>
      </template>
    </q-tree>
  </div>
</template>

<script lang="ts">
// types
import { defineComponent } from "vue";
import { Folder, Project } from "src/backend/database";
import { QTree, QTreeNode } from "quasar";
//db
import { useStateStore } from "src/stores/appState";
import {
  getFolderTree,
  addFolder,
  updateFolder,
  deleteFolder,
  moveFolderInto,
  getParentFolder,
} from "src/backend/project/folder";
import { sortTree } from "src/backend/project/utils";
import { getProject, updateProject } from "src/backend/project/project";
import { updateAppState } from "src/backend/appState";

export default defineComponent({
  props: { draggingProjectId: String },
  emits: ["exportFolder"],

  setup() {
    const stateStore = useStateStore();
    return { stateStore };
  },

  data() {
    return {
      specialFolderIds: ["library"],
      folders: [] as QTreeNode[],
      expandedKeys: ["library"],

      renamingFolderId: "",
      draggingNode: null as Folder | null,
      dragoverNode: null as Folder | null,
      enterTime: 0,
    };
  },

  async mounted() {
    this.folders = (await getFolderTree()) as QTreeNode[];
  },

  methods: {
    async saveState() {
      if (!this.stateStore.ready) return;
      let state = this.stateStore.saveState();
      await updateAppState(state);
    },

    /**************************
     * Add, delete, update, export
     **************************/

    /**
     * Add folder to selected node
     * @param parentNode
     * @param label - folder name
     */
    async addFolder(parentNode: Folder, label?: string, focus?: boolean) {
      // add to database
      let node = (await addFolder(parentNode._id)) as Folder;

      // set node label if we specify one
      if (!!label) {
        node.label = label;
        node = (await updateFolder(node._id, { label: node.label })) as Folder;
      }

      // add to UI and expand the parent folder
      parentNode.children.push(node);
      this.expandedKeys.push(parentNode._id);

      // focus on it
      if (focus) this.stateStore.selectedFolderId = node._id;

      // rename it if label is empty
      if (!!!label) this.setRenameFolder(node);
    },

    /**
     * Delete selected folder
     * @param node
     */
    deleteFolder(node: Folder) {
      if (this.specialFolderIds.includes(node._id)) return;

      // remove from ui
      function _dfs(oldNode: Folder): Folder[] {
        var newNode = [] as Folder[];
        for (let n of oldNode.children) {
          if ((n as Folder)._id !== node._id) {
            // if (!newNode.children) newNode.children = [];
            newNode.push({
              _id: (n as Folder)._id,
              icon: (n as Folder).icon,
              label: (n as Folder).label,
              children: _dfs(n as Folder),
            } as Folder);
          }
        }
        return newNode;
      }
      this.folders[0].children = _dfs(this.folders[0] as Folder) as QTreeNode[];

      // remove from db
      deleteFolder(node._id);
    },

    /**
     * Reveal input to rename for selected folder
     * @param node
     */
    setRenameFolder(node: Folder) {
      this.renamingFolderId = node._id;

      setTimeout(() => {
        // wait till input appears
        // focus onto the input and select the text
        let input = this.$refs.renameInput as HTMLInputElement;
        input.focus();
        input.select();
      }, 100);
    },

    /**
     * Hide input and update db and ui
     */
    renameFolder() {
      if (!!!this.renamingFolderId) return;

      // update db
      let node = (this.$refs.tree as QTree).getNodeByKey(this.renamingFolderId);
      updateFolder(node._id, { label: node.label });

      // update ui
      this.renamingFolderId = "";

      // sort the tree
      sortTree(this.folders[0] as Folder);
    },

    /**
     * Export a collection of references
     * @param folder
     */
    exportFolder(folder: Folder) {
      this.$emit("exportFolder", folder);
    },

    /****************
     * Drag and Drop
     ****************/

    /**
     * On dragstart, set the dragging folder
     * @param e - dragevent
     * @param node - the folder user is dragging
     */
    onDragStart(e: DragEvent, node: Folder) {
      this.draggingNode = node;
    },

    /**
     * When dragging node is over the folder, highlight and expand it.
     * @param e - dragevent
     * @param node - the folder user is dragging
     */
    onDragOver(e: DragEvent, node: Folder) {
      // enable drop on the node
      e.preventDefault();

      // hightlight the dragover folder
      this.dragoverNode = node;

      // expand the node if this function is called over many times
      this.enterTime++;
      if (this.enterTime > 15) {
        if (node._id in this.expandedKeys) return;
        this.expandedKeys.push(node._id);
      }
    },

    /**
     * When the dragging node leaves the folders, reset the timer
     * @param e
     * @param node
     */
    onDragLeave(e: DragEvent, node: Folder) {
      this.enterTime = 0;
    },

    /**
     * If draggingProjectId is not empty, then we are dropping project into folder
     * Otherwise we are dropping folder into another folder
     * @param e - dragevent
     * @param node - the folder / project user is dragging
     */
    async onDrop(e: DragEvent, node: Folder) {
      if (this.draggingNode == node) return;
      // record this first otherwise dragend events makes it null
      let dragoverNode = this.dragoverNode as Folder;
      let draggingNode = this.draggingNode;
      let draggingProjectId = this.draggingProjectId;

      if (!!draggingProjectId) {
        // drag and drop project into folder
        let project = (await getProject(draggingProjectId)) as Project;
        if (!project.folderIds.includes(dragoverNode._id)) {
          project.folderIds.push(dragoverNode._id);
          await updateProject(project);
        }

        this.onDragEnd(e);
      } else {
        // drag folder into another folder
        // update ui (do this first since parentfolder will change)
        if (draggingNode === null) return;
        let dragParentFolder = (await getParentFolder(
          draggingNode._id
        )) as Folder;
        let dragParentNode = (this.$refs.tree as QTree).getNodeByKey(
          dragParentFolder._id
        ) as Folder;
        dragParentNode.children = dragParentNode.children.filter(
          (folder) => (folder as Folder)._id != (draggingNode as Folder)._id
        );
        node.children.push(draggingNode);

        // update db
        await moveFolderInto(draggingNode._id, node._id);
      }
    },

    /**
     * Remove highlights
     * @param e - dragevent
     */
    onDragEnd(e: DragEvent) {
      this.draggingNode = null;
      this.dragoverNode = null;
    },
  },
});
</script>
<style lang="scss" scoped>
.dragover {
  border: 1px solid aqua;
  background-color: rgba(0, 255, 255, 0.5);
}
</style>
