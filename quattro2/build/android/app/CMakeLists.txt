#
# Copyright 2017 The Android Open Source Project
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

cmake_minimum_required(VERSION 3.4.1)
project(quattro LANGUAGES C CXX)

### INCLUDE TG LIBRARY ###
#set (TG_NAME tg_template)
#set (LIBTG_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../libtg)
#set (TG_DIR ${LIBTG_DIR}/${TG_NAME}/android)
#add_subdirectory(${TG_DIR} ./tg-bin)
### END INCLUDE SECTION ###

set (QUATTRO_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../quattro2)
set (MISC_DIR ${QUATTRO_DIR}/android/main/cpp)
set (CONTRIBUTED_DIR ${QUATTRO_DIR}/contributed)
file (GLOB_RECURSE MISC_SOURCES
    ${MISC_DIR}/jni_bridge.cpp
    ${MISC_DIR}/security.cpp
    ${CONTRIBUTED_DIR}/SHA-1/sha1.c
)

include_directories(
    src/main/include
    ${CONTRIBUTED_DIR}/SHA-1
)
add_library(misc SHARED ${MISC_SOURCES} )

target_link_libraries(misc android log)
#target_compile_options(misc PRIVATE -Wall -Werror "$<$<CONFIG:RELEASE>:-Ofast>")
target_compile_options(misc PRIVATE -Wall -Werror -Ofast)

string(REGEX MATCH "[/\\\\]ndk[/\\\\]([0-9]+)\\.[0-9]+\\." NDK_VERSION_MATCH ${CMAKE_ANDROID_NDK})
set(NDK_VERSION_MAJOR ${CMAKE_MATCH_1})
if(${NDK_VERSION_MAJOR} LESS 28)
    target_link_options(misc PRIVATE "-Wl,-z,max-page-size=16384")
endif()
