# Feedback

## Feb 22 Code Complete & Initial Results

### replicable implementation details 4/4
This section is easy to follow and concisely written.

One thing that's **unclear to me is how highlighting is used specifically**: is it
it for fully connected clusters? Or for clusters that are only reachable from
the rest of the graph via a smaller number of connections (so they're
somewhat isolated subgraphs)?  I don't think this is quite deduction-worthy because this seems more like a bonus than a core necessary feature.

### working implementation or pilot study 6/6
Oh I didn't understand that your user study before was made up, thanks for
clarifying.

Figs 3 and 4 definitely demonstrate that you have a working prototype, and you
seem to be pretty nearly code complete, so nice work there.

Pro-tip: 
- [x] you can make your **TODO a .md and use -[ ] to make an unchecked box and -[x] a checked one** and I'm pretty sure github still renders them nicely.
- [x] And *then*, you include the change to **TODO.md as part of the commit that implements that TODO item** and it's all very satisfying and tidy.

## Feb 17 - Related Work and Methodology
### introduction 1/1 
Nice intro: clearly explains the motivation and use case, introduces terms precisely. I'm surprised that you don't touch on this directly (though you *almost* do) - wouldn't this type of tooling also be useful for the initial engineers who implement the source code to design it better in the first place? "A classic problem in graph visualizations is what to do when there is too much data. We need to solve this problem in the context of program comprehension." => yeah this is interesting. what are typical solutions? 

### description of technical approach 1/1
Nice breakdown of the three technical areas: analysis, visualization, architecture and integration. Oh boy there are a lot of open questions outlined in your technical approach... Ambitious. Especially if the analysis of code is static (which is probably easier as a first approach, too), it seems like your "background server" should actually just be plugged into the build system with other typical static analyses. So in most cases that can just run locally on the same machine as the engineer is using. Given how much there is to do with this project, it seems to me light you ought to be holding off on any optimization effort until you have a working prototype that runs on small/toy examples. Really nice concrete decisions to start on Visual Studio Code and use d3.js to render. I think it's a pretty common decision for tools like this to render in a browser. 

### related work 3/3 experimental methodology (evaluation plan) 5/5 
This is detailed and thorough. Seems obviously replicable. Worth thinking about is tool uptake time: I would actually expect performance to suffer initially even with a worthwhile tool, and to find beneficial results only after users have become sufficiently familiar - right? Oh you actually have a lot of results already, seems like a positive sign. I'm confused by the one chart of task time you have though: it doesn't look like visualization users outperform non-users for tasks C or D, but you state that users of visualization are faster for all tasks.

## Jan 27 - Revised Project Proposal 
+ motivates problem 
+ addresses current work & how this is novel 
+ has evaluation plan 

This looks great, and reads like you're excited about the idea. I have some concerns about what will happen when you try to visualize a really big codebase with lots of interconnectedness, but if you do use d3.js there are plenty of good examples of visualizing big networks that you can follow.