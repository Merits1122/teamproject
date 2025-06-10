import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, CheckCircle, Clock, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
        <Link className="flex items-center justify-center" href="#">
          <span className="font-bold text-xl">TaskFlow</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              로그인
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">회원가입</Button>
          </Link>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    팀 프로젝트를 쉽게 관리하세요
                  </h1>
                  <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                    TaskFlow는 팀이 조직적으로 일하고, 진행 상황을 추적하며, 프로젝트를 제시간에 완료할 수 있도록
                    도와줍니다.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/register">
                    <Button size="lg" className="gap-1">
                      시작하기
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-full h-[350px] bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg overflow-hidden shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[90%] h-[80%] bg-background rounded-lg shadow-md p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div className="ml-4 text-sm font-medium">프로젝트 대시보드</div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 h-[calc(100%-2rem)]">
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs font-medium mb-2">할 일</div>
                          <div className="space-y-2">
                            <div className="bg-background p-2 rounded text-xs shadow-sm">홈페이지 디자인</div>
                            <div className="bg-background p-2 rounded text-xs shadow-sm">API 통합</div>
                            <div className="bg-background p-2 rounded text-xs shadow-sm">사용자 테스트</div>
                          </div>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs font-medium mb-2">진행 중</div>
                          <div className="space-y-2">
                            <div className="bg-background p-2 rounded text-xs shadow-sm">백엔드 설정</div>
                            <div className="bg-background p-2 rounded text-xs shadow-sm">인증 시스템</div>
                          </div>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs font-medium mb-2">완료</div>
                          <div className="space-y-2">
                            <div className="bg-background p-2 rounded text-xs shadow-sm">프로젝트 계획</div>
                            <div className="bg-background p-2 rounded text-xs shadow-sm">와이어프레임</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">팀을 강화하는 기능들</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                  프로젝트 관리, 작업 추적, 팀 협업에 필요한 모든 것을 제공합니다.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">팀 협업</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    팀원을 초대하고, 작업을 할당하며, 원활하게 협업하세요.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">작업 관리</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    맞춤형 워크플로우로 작업을 생성, 구성 및 추적하세요.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">마감일 추적</h3>
                  <p className="text-gray-500 dark:text-gray-400">마감일을 설정하고 알림을 받아 일정을 유지하세요.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 TaskFlow. 모든 권리 보유.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            서비스 약관
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            개인정보 처리방침
          </Link>
        </nav>
      </footer>
    </div>
  )
}
