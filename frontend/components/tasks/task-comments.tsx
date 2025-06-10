"use client"

import type React from "react"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Send, Edit, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Comment = {
  id: number
  user: {
    id: number
    name: string
    avatar: string
    initials: string
  }
  content: string
  createdAt: string
}

type TaskCommentsProps = {
  taskId: number | string
  initialComments?: Comment[]
  onCommentAdded?: () => void
  currentUserId?: number // 현재 사용자 ID
  isAdmin?: boolean // 관리자 여부
}

// 샘플 댓글 데이터
const sampleComments: Comment[] = [
  {
    id: 1,
    user: {
      id: 1,
      name: "홍길동",
      avatar: "",
      initials: "홍",
    },
    content: "이 작업에 대해 질문이 있습니다. 언제까지 완료해야 하나요?",
    createdAt: "2025-01-27T10:30:00.000Z",
  },
  {
    id: 2,
    user: {
      id: 2,
      name: "김철수",
      avatar: "",
      initials: "김",
    },
    content: "내일까지 완료 예정입니다. 추가 리소스가 필요하면 말씀해 주세요.",
    createdAt: "2025-01-27T11:15:00.000Z",
  },
]

export function TaskComments({
  taskId,
  initialComments = sampleComments,
  onCommentAdded,
  currentUserId = 1, // 기본값으로 1 설정 (실제 앱에서는 context에서 가져옴)
  isAdmin = false, // 기본값으로 false 설정
}: TaskCommentsProps) {
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editedContent, setEditedContent] = useState("")

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "댓글을 입력해주세요",
        description: "댓글 내용을 입력한 후 전송해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 실제 앱에서는 API 호출을 여기서 수행합니다
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const currentUser = {
        id: 1, // 실제 앱에서는 현재 사용자 ID
        name: "Current User", // 실제 앱에서는 현재 사용자 이름
        avatar: "",
        initials: "CU",
      }

      const newCommentObj: Comment = {
        id: Math.floor(Math.random() * 1000),
        user: currentUser,
        content: newComment,
        createdAt: new Date().toISOString(),
      }

      setComments((prev) => [...prev, newCommentObj])
      setNewComment("")

      if (onCommentAdded) {
        onCommentAdded()
      }

      toast({
        title: "댓글이 추가되었습니다",
        description: "댓글이 성공적으로 추가되었습니다.",
      })
    } catch (error) {
      toast({
        title: "댓글 추가 실패",
        description: "댓글을 추가하는 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = (commentId: number, content: string) => {
    setEditingCommentId(commentId)
    setEditedContent(content)
  }

  const handleSaveEdit = async (commentId: number) => {
    if (!editedContent.trim()) {
      toast({
        title: "댓글을 입력해주세요",
        description: "댓글 내용을 입력한 후 저장해주세요.",
        variant: "destructive",
      })
      return
    }

    try {
      // 실제 앱에서는 API 호출을 여기서 수행합니다
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? { ...comment, content: editedContent } : comment)),
      )

      setEditingCommentId(null)
      setEditedContent("")

      toast({
        title: "댓글이 수정되었습니다",
        description: "댓글이 성공적으로 수정되었습니다.",
      })
    } catch (error) {
      toast({
        title: "댓글 수정 실패",
        description: "댓글을 수정하는 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditedContent("")
  }

  const handleDeleteComment = async (commentId: number) => {
    try {
      // 실제 앱에서는 API 호출을 여기서 수행합니다
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setComments((prev) => prev.filter((comment) => comment.id !== commentId))

      toast({
        title: "댓글이 삭제되었습니다",
        description: "댓글이 성공적으로 삭제되었습니다.",
      })
    } catch (error) {
      toast({
        title: "댓글 삭제 실패",
        description: "댓글을 삭제하는 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleAddComment()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="text-lg font-semibold">댓글 ({comments.length})</h3>
      </div>

      {/* 기존 댓글 목록 */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatar || "/placeholder.svg"} alt={comment.user.name} />
                    <AvatarFallback>{comment.user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {/* 수정/삭제 버튼 - 본인 댓글이거나 관리자인 경우에만 표시 */}
                      {(comment.user.id === currentUserId || isAdmin) && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditComment(comment.id, comment.content)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">댓글 수정</span>
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">댓글 삭제</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>댓글을 삭제하시겠습니까?</DialogTitle>
                                <DialogDescription>
                                  이 작업은 되돌릴 수 없습니다. 댓글이 영구적으로 삭제됩니다.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">취소</Button>
                                <Button variant="destructive" onClick={() => handleDeleteComment(comment.id)}>
                                  삭제
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>

                    {/* 댓글 내용 - 편집 모드인지 확인 */}
                    {editingCommentId === comment.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="댓글을 수정하세요..."
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            취소
                          </Button>
                          <Button size="sm" onClick={() => handleSaveEdit(comment.id)}>
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm">{comment.content}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground text-center">아직 댓글이 없습니다.</p>
          </CardContent>
        </Card>
      )}

      {/* 새 댓글 작성 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 댓글 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="댓글을 입력하세요... (Ctrl+Enter로 전송)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button onClick={handleAddComment} disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting ? (
                "전송 중..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  댓글 달기
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
