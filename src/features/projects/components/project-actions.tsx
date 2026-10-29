"use client";

import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import type { ActionState } from "@/lib/action-state";
import { deleteProjectAction, setProjectStatusAction, updateProjectAction } from "../actions";
import { ProjectForm } from "./project-form";

export function ProjectActions({
  project,
  canEdit,
  canDelete,
}: {
  project: { id: string; name: string; description: string; status: "active" | "archived" };
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [result, setResult] = useState<ActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  if (!canEdit && !canDelete) return null;

  const toggleArchive = () =>
    startTransition(async () => {
      setResult(await setProjectStatusAction(project.id, project.status === "active" ? "archived" : "active"));
    });

  const confirmDelete = () =>
    startTransition(async () => {
      setResult(await deleteProjectAction(project.id));
    });

  return (
    <>
      <DropdownMenu
        label="Project actions"
        trigger={
          <Button variant="outline" aria-label="Project actions" loading={pending}>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" /> Actions
          </Button>
        }
      >
        {canEdit ? (
          <>
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleArchive}>
              {project.status === "active" ? (
                <>
                  <Archive className="h-4 w-4" aria-hidden="true" /> Archive
                </>
              ) : (
                <>
                  <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> Restore
                </>
              )}
            </DropdownMenuItem>
          </>
        ) : null}
        {canDelete ? (
          <>
            {canEdit ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem destructive onSelect={() => setConfirmingDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete project
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenu>

      {result.status === "error" ? (
        <div className="w-full">
          <Alert variant="error">{result.message}</Alert>
        </div>
      ) : null}

      <Modal open={editing} onOpenChange={setEditing} title="Edit project">
        <ProjectForm
          action={updateProjectAction.bind(null, project.id)}
          defaults={{ name: project.name, description: project.description }}
          submitLabel="Save changes"
        />
      </Modal>

      <Modal
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete “${project.name}”?`}
        description="This permanently deletes the project and all of its tasks. This can't be undone."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} loading={pending}>
              Delete project
            </Button>
          </>
        }
      />
    </>
  );
}
