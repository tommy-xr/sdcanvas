# `sdcanvas`

## Overview

System Design Canvas (`sdcanvas`)

This is a drawing tool focused on high-level system architecture - geared towards system design interviews. Think of it like an IDE for system design.

## Background

This was born out of my poor interview performance on system design interviews. 

Though I consider myself an experienced engineer with broad experience across stacks - I struggle with this format of an interview. I always have the feeling _after_ the interview of things I could've done differently/better, but on the spot, not ideal.

I think this boils down to a few things:
1. Fighting tools - I've jumped between various tools like Excalidraw/draw.io/Figjam in order to whiteboard and lay out my thoughts but never felt in the 'flow' state. There were always hurdles like "how best to draw a schema table?" that would take away from problem solving.
2. Lack of structure - The combination of being open-ended + artificial can be challenging to me. In some cases, I design past what the interviewer asked for, and in other cases I gloss over some parts of the problem the interview was looking for.
3. How my brain works - I've found that I work best when I have the ability to _process internally first_ and then share conclusions. This goes for interviews as well as other activities (like pair programming, where I am also less effective). I'm not sure if this is because having another person observing causes me to externalize prematurely and interrupts my thinking loop, or that a social "background process" is stealing cycles. Either way - this is just unfortunately how my own brain works and I need to find ways to adapt.

Reflecting on these:

2) is really a preparation issue - being more prepared and practicing the structure (ie, gather requirements/ask clarifying questions -> sketch out entities -> sketch out high level architecture -> model db) will help me here.

3) is a personal problem - it's just how my brain works, and I need to continually find ways to adapt.

This repo, though, is focused on exploring 1) - is there a better tool that could be like an IDE for system design?

My ideal tool would keep me away from caring about drawing squares or rectangles and instead model the actual relationships of things like API servers, user, databases - with being able to _simulate_ traffic patterns to measure scalability.