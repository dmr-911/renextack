"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createProjectAction } from "../actions";
import { ProjectForm } from "./project-form";

/** The dialog's open state lives in the URL (?new=1) so "New project" links work from anywhere. */
export function NewProjectDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get("new") === "1";

  const setOpen = (next: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("new", "1");
    else params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="New project"
      description="Projects group related tasks. You can rename it later."
      trigger={
        <Button>
          <Plus className="h-4 w-4" aria-hidden="true" /> New project
        </Button>
      }
    >
      <ProjectForm action={createProjectAction} submitLabel="Create project" />
    </Modal>
  );
}
