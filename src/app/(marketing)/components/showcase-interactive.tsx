"use client";

import { Copy, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Modal, ModalClose } from "@/components/ui/modal";

export function ShowcaseInteractive() {
  const [last, setLast] = useState<string>("nothing yet");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Modal
        title="Example dialog"
        description="Focus is trapped inside. Press Escape or use the buttons to close."
        trigger={<Button variant="outline">Open modal</Button>}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ModalClose>
            <ModalClose asChild>
              <Button onClick={() => setLast("confirmed the dialog")}>Confirm</Button>
            </ModalClose>
          </>
        }
      />
      <DropdownMenu label="Example menu" align="start" trigger={<Button variant="outline">Open menu</Button>}>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => setLast("chose Edit")}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLast("chose Duplicate")}>
          <Copy className="h-4 w-4" aria-hidden="true" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => setLast("chose Delete")}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </DropdownMenuItem>
      </DropdownMenu>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Last action: {last}
      </p>
    </div>
  );
}
