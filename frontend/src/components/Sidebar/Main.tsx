import { Link as RouterLink, useRouterState } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type {
  NavigationEntry,
  NavigationGroup,
  NavigationTool,
} from "@/config/tool-navigation"
import { cn } from "@/lib/utils"

interface MainProps {
  items: NavigationEntry[]
}

export function Main({ items }: MainProps) {
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar()
  const router = useRouterState()
  const currentPath = router.location.pathname
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setOpenGroups((currentGroups) => {
      let hasChanges = false
      const nextGroups = { ...currentGroups }

      for (const item of items) {
        if (item.kind !== "group") {
          continue
        }

        if (typeof nextGroups[item.title] === "undefined") {
          nextGroups[item.title] = item.defaultExpanded ?? false
          hasChanges = true
        }
      }

      return hasChanges ? nextGroups : currentGroups
    })
  }, [items])

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleGroupToggle = (group: NavigationGroup) => {
    if (state === "collapsed" && !isMobile) {
      setOpen(true)
      setOpenGroups((currentGroups) => ({
        ...currentGroups,
        [group.title]: true,
      }))
      return
    }

    setOpenGroups((currentGroups) => ({
      ...currentGroups,
      [group.title]: !currentGroups[group.title],
    }))
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            if (item.kind === "group") {
              const isGroupActive = item.children.some((child) =>
                isPathActive(child.path, currentPath),
              )
              const isOpen =
                openGroups[item.title] ?? item.defaultExpanded ?? false

              return (
                <SidebarMenuItem
                  key={item.title}
                  className="transition-[transform,margin] duration-300 ease-out"
                >
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isGroupActive}
                    onClick={() => handleGroupToggle(item)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    <ChevronRight
                      className={cn(
                        "ml-auto transition-transform duration-300 ease-out",
                        isOpen ? "rotate-90" : "",
                      )}
                    />
                  </SidebarMenuButton>
                  <div
                    className={cn(
                      "grid min-h-0 transition-[grid-template-rows,opacity] duration-300 ease-out",
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-80",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <SidebarMenuSub
                        className={cn(
                          "transition-[opacity,transform] duration-300 ease-out",
                          isOpen
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-1 opacity-0",
                        )}
                      >
                        {item.children.map((child, index) => (
                          <ToolMenuSubItem
                            key={child.title}
                            item={child}
                            currentPath={currentPath}
                            onClick={handleMenuClick}
                            isOpen={isOpen}
                            index={index}
                          />
                        ))}
                      </SidebarMenuSub>
                    </div>
                  </div>
                </SidebarMenuItem>
              )
            }

            return (
              <ToolMenuItem
                key={item.title}
                item={item}
                currentPath={currentPath}
                onClick={handleMenuClick}
              />
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function ToolMenuItem({
  item,
  currentPath,
  onClick,
}: {
  item: NavigationTool
  currentPath: string
  onClick: () => void
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={isPathActive(item.path, currentPath)}
        asChild
      >
        <RouterLink to={item.path} onClick={onClick}>
          <item.icon />
          <span>{item.title}</span>
        </RouterLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function ToolMenuSubItem({
  item,
  currentPath,
  onClick,
  isOpen,
  index,
}: {
  item: NavigationTool
  currentPath: string
  onClick: () => void
  isOpen: boolean
  index: number
}) {
  return (
    <SidebarMenuSubItem
      className={cn(
        "transition-[opacity,transform] duration-300 ease-out",
        isOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
      )}
      style={{
        transitionDelay: isOpen ? `${index * 40}ms` : "0ms",
      }}
    >
      <SidebarMenuSubButton
        asChild
        isActive={isPathActive(item.path, currentPath)}
      >
        <RouterLink to={item.path} onClick={onClick}>
          <item.icon />
          <span>{item.title}</span>
        </RouterLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function isPathActive(path: string, currentPath: string) {
  if (path === "/") {
    return currentPath === path
  }

  return currentPath === path || currentPath.startsWith(`${path}/`)
}
