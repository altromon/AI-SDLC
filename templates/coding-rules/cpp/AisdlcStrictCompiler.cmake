# AI-SDLC: Immutable C/C++ Compiler & CTest Guardrails
if(MSVC)
  add_compile_options(/W4 /WX /permissive-)
else()
  add_compile_options(-Wall -Wextra -Wpedantic -Werror -Wnull-dereference -Wunused-result)
endif()

set(CMAKE_CXX_CLANG_TIDY "clang-tidy")
set(CMAKE_C_CLANG_TIDY "clang-tidy")
