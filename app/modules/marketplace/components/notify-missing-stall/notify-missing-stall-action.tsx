"use client"

import * as React from "react"
import { Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { MarketplaceReservation } from "@/app/modules/marketplace/marketplace.schema"

import { NotifyMissingStallDialog } from "./notify-missing-stall-dialog"

export function NotifyMissingStallAction(props: {
  fairId: string
  fairName?: string | null
  slotLabel: string
  reservation: MarketplaceReservation | null
  disabled?: boolean
  buttonClassName?: string
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  buttonSize?: React.ComponentProps<typeof Button>["size"]
  label?: string
}) {
  const {
    fairId,
    fairName,
    slotLabel,
    reservation,
    disabled,
    buttonClassName,
    buttonVariant = "outline",
    buttonSize = "default",
    label = "Alertar por e-mail",
  } = props

  const [open, setOpen] = React.useState(false)

  if (!reservation) return null

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        className={buttonClassName}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Mail className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <NotifyMissingStallDialog
        open={open}
        onOpenChange={setOpen}
        fairId={fairId}
        fairName={fairName}
        slotLabel={slotLabel}
        reservation={reservation}
      />
    </>
  )
}
